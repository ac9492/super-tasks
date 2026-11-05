import { TestBed } from '@angular/core/testing';
import { AccountClient, SyncClient, randomKey } from '@ultra-tasks/account-crypto';
import { NativeSyncService } from './native-sync.service';
import { NativePersonalBridgeService } from './native-personal-bridge.service';

describe('NativeSyncService', () => {
  let service: NativeSyncService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NativeSyncService,
        {
          provide: NativePersonalBridgeService,
          useValue: { bind: async () => true, clear: () => undefined },
        },
      ],
    });
    service = TestBed.inject(NativeSyncService);
  });
  afterEach(async () => {
    await service.lock();
    localStorage.removeItem('ultra-native-account:http://localhost:1900');
  });
  it('rejects insecure remote endpoints before sending credentials', async () => {
    await expectAsync(
      service.login('http://remote.example.com', 'alice', 'password'),
    ).toBeRejectedWithError('NATIVE_SYNC.ERROR_URL');
    expect(service.account).toBeUndefined();
  });
  it('schedules personal sync every 60 seconds, resumes online, and stops when locked', async () => {
    spyOn(AccountClient.prototype, 'login').and.callFake(async function (
      this: AccountClient,
    ) {
      this.capabilities = { serverId: 'server', protocol: 2, features: {} };
      this.account = {
        id: 'account',
        email: 'a@example.test',
        username: 'alice',
        displayName: '',
        vaultVersion: 1,
      };
      this.unlocked = {
        masterKey: randomKey(),
        secrets: {} as NonNullable<AccountClient['unlocked']>['secrets'],
      };
      this.tokens = { accessToken: 'access', refreshToken: 'refresh', expiresIn: 600 };
      return this.tokens;
    });
    spyOn(SyncClient.prototype, 'init').and.callFake(async function (this: SyncClient) {
      this.state = { scopes: {} } as SyncClient['state'];
    });
    spyOn(SyncClient.prototype, 'refreshScopes').and.resolveTo([]);
    const sync = spyOn(service, 'syncNow').and.resolveTo();
    jasmine.clock().install();
    try {
      await service.login('http://localhost:1900', 'alice', 'password');
      expect(sync).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(59999);
      expect(sync).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(1);
      expect(sync).toHaveBeenCalledTimes(2);
      window.dispatchEvent(new Event('online'));
      expect(sync).toHaveBeenCalledTimes(3);
      await service.lock();
      jasmine.clock().tick(60000);
      window.dispatchEvent(new Event('online'));
      expect(sync).toHaveBeenCalledTimes(3);
    } finally {
      jasmine.clock().uninstall();
    }
    const saved = localStorage.getItem('ultra-native-account:http://localhost:1900')!;
    expect(saved).not.toContain('"refreshToken"');
    expect(saved).not.toContain('"masterKey"');
  });
});
