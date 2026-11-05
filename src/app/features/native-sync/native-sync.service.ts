import { computed, inject, Injectable, signal } from '@angular/core';
import {
  AccountClient,
  EncryptedSyncStorage,
  SyncClient,
  httpTransport,
  open,
  seal,
  unlockBundle,
  type AccountBundle,
  type AccountInfo,
  type Capabilities,
  type Envelope,
  type Invitation,
  type ScopeInfo,
} from '@ultra-tasks/account-crypto';
import { NativePersonalBridgeService } from './native-personal-bridge.service';

interface CachedAccount {
  capabilities: Capabilities;
  account: AccountInfo;
  bundle: AccountBundle;
  refresh: Envelope;
}
const PERIOD = 60000;

@Injectable({ providedIn: 'root' })
export class NativeSyncService {
  private readonly bridge = inject(NativePersonalBridgeService);
  readonly status = signal('NATIVE_SYNC.LOCKED');
  readonly error = signal('');
  readonly busy = signal(false);
  readonly unlocked = signal(false);
  readonly linked = signal(false);
  readonly scopes = signal<ScopeInfo[]>([]);
  readonly invitations = signal<Invitation[]>([]);
  readonly projects = computed(() => this.scopes().filter((s) => s.kind === 'project'));
  readonly revision = signal(0);
  client?: SyncClient;
  account?: AccountClient;
  serverUrl = '';
  private interval?: ReturnType<typeof setInterval>;
  private releaseLease?: () => void;
  private inFlight?: Promise<void>;

  private cacheKey(): string {
    return 'ultra-native-account:' + this.serverUrl;
  }
  private cacheContext(): string {
    return JSON.stringify({ ...this.account!.identity(), purpose: 'native-session' });
  }
  private async cache(): Promise<void> {
    const account = this.account!;
    const refresh = await seal(
      account.unlocked!.masterKey,
      account.tokens!.refreshToken,
      this.cacheContext(),
    );
    localStorage.setItem(
      this.cacheKey(),
      JSON.stringify({
        capabilities: account.capabilities,
        account: account.account,
        bundle: account.bundle,
        refresh,
      }),
    );
    localStorage.setItem('ultra-native-server', this.serverUrl);
  }
  async login(serverUrl: string, identifier: string, password: string): Promise<boolean> {
    this.error.set('');
    const url = new URL(serverUrl);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' &&
        !(
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        ))
    )
      throw new Error('NATIVE_SYNC.ERROR_URL');
    this.serverUrl = url.href.replace(/\/$/, '');
    this.account = new AccountClient(httpTransport(this.serverUrl));
    try {
      const result = await this.account.login(identifier, password);
      if (result.mfaToken) {
        this.status.set('NATIVE_SYNC.MFA');
        return false;
      }
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const raw = localStorage.getItem(this.cacheKey());
      if (!raw) throw error;
      const cached = JSON.parse(raw) as CachedAccount;
      if (
        ![cached.account.id, cached.account.email, cached.account.username].includes(
          identifier.trim().toLowerCase(),
        )
      )
        throw error;
      const unlocked = await unlockBundle(
        cached.bundle,
        { serverId: cached.capabilities.serverId, accountId: cached.account.id },
        { password },
      );
      this.account.capabilities = cached.capabilities;
      this.account.account = cached.account;
      this.account.bundle = cached.bundle;
      this.account.unlocked = unlocked;
    }
    await this.finishLogin();
    return true;
  }
  async completeMfa(code: string): Promise<void> {
    await this.account!.completeMfa(code);
    await this.finishLogin();
  }
  async passkey(): Promise<void> {
    const { options, credentialToken } = await this.account!.webauthnLoginOptions();
    const credentialClass = PublicKeyCredential as typeof PublicKeyCredential & {
      parseRequestOptionsFromJSON(options: object): PublicKeyCredentialRequestOptions;
    };
    if (!credentialClass.parseRequestOptionsFromJSON)
      throw new Error('NATIVE_SYNC.ERROR_PASSKEY');
    const credential = (await navigator.credentials.get({
      publicKey: credentialClass.parseRequestOptionsFromJSON(options),
    })) as (PublicKeyCredential & { toJSON(): unknown }) | null;
    if (!credential) throw new Error('NATIVE_SYNC.ERROR_PASSKEY');
    await this.account!.completeWebauthn(credentialToken, credential.toJSON());
    await this.finishLogin();
  }
  private async lease(): Promise<void> {
    if (!navigator.locks) throw new Error('NATIVE_SYNC.ERROR_BROWSER');
    await new Promise<void>((resolve, reject) => {
      void navigator.locks
        .request('ultra-native-workspace', { ifAvailable: true }, async (lock) => {
          if (!lock) {
            reject(new Error('NATIVE_SYNC.ERROR_TAB'));
            return;
          }
          await new Promise<void>((release) => {
            this.releaseLease = release;
            resolve();
          });
        })
        .catch(reject);
    });
  }
  private async finishLogin(): Promise<void> {
    await this.lease();
    const account = this.account!;
    account.onTokensChanged = () => this.cache();
    try {
      this.client = new SyncClient(
        account,
        new EncryptedSyncStorage(account.unlocked!.masterKey, account.identity()),
      );
      await this.client.init();
      if (account.tokens) {
        await this.cache();
        await this.client.refreshScopes();
      }
      this.scopes.set(Object.values(this.client.state.scopes).map((s) => s.info));
      this.linked.set(await this.bridge.bind(this.client));
      this.unlocked.set(true);
      this.status.set('NATIVE_SYNC.READY');
      this.interval = setInterval(() => {
        void this.syncNow();
      }, PERIOD);
      window.addEventListener('online', this.resume);
      document.addEventListener('visibilitychange', this.resume);
      if (this.linked()) await this.syncNow();
    } catch (error) {
      await this.lock();
      throw error;
    }
  }
  private readonly resume = (): void => {
    if (document.visibilityState !== 'hidden') void this.syncNow();
  };
  private async reconnect(): Promise<void> {
    if (this.account!.tokens) return;
    const cached = JSON.parse(localStorage.getItem(this.cacheKey())!) as CachedAccount;
    const refreshToken = await open(
      this.account!.unlocked!.masterKey,
      cached.refresh,
      this.cacheContext(),
    );
    const tokens = await this.account!.transport('/sessions/refresh', { refreshToken });
    this.account!.adoptTokens(tokens as Parameters<AccountClient['adoptTokens']>[0]);
    await this.cache();
  }
  async link(migrate: boolean): Promise<void> {
    this.busy.set(true);
    try {
      if (migrate) await this.bridge.migrate();
      else await this.bridge.useExisting();
      this.linked.set(true);
      await this.refresh();
    } finally {
      this.busy.set(false);
    }
  }
  syncNow(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (!this.client || !this.unlocked()) return Promise.resolve();
    this.inFlight = this.sync().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }
  private async sync(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.linked()) await this.bridge.capture();
      await this.reconnect();
      const errors = await this.client!.syncAll();
      if (this.linked() && !errors[this.bridge.scopeId!]) await this.bridge.apply();
      await this.refresh();
      if (Object.keys(errors).length) throw new Error(Object.values(errors).join('; '));
      this.status.set('NATIVE_SYNC.SYNCED');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'NATIVE_SYNC.ERROR_SYNC');
    } finally {
      this.busy.set(false);
      this.revision.update((n) => n + 1);
    }
  }
  async refresh(): Promise<void> {
    this.scopes.set(await this.client!.refreshScopes());
    this.invitations.set(await this.client!.invitations());
    this.revision.update((n) => n + 1);
  }
  async lock(): Promise<void> {
    if (this.interval) clearInterval(this.interval);
    window.removeEventListener('online', this.resume);
    document.removeEventListener('visibilitychange', this.resume);
    if (this.inFlight) await this.inFlight;
    this.client = undefined;
    this.account?.lock();
    this.account = undefined;
    this.bridge.clear();
    this.releaseLease?.();
    this.releaseLease = undefined;
    this.scopes.set([]);
    this.invitations.set([]);
    this.unlocked.set(false);
    this.linked.set(false);
    this.status.set('NATIVE_SYNC.LOCKED');
  }
}
