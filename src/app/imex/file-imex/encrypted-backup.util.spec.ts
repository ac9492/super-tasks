import {
  clearSessionKeyCache,
  getArgon2Params,
  setArgon2ParamsForTesting,
} from '@sp/sync-core';
import { encryptBackupFile, decryptBackupFile } from './encrypted-backup.util';

describe('encrypted backup files', () => {
  const originalParams = getArgon2Params();
  beforeAll(() =>
    setArgon2ParamsForTesting({ iterations: 1, memorySize: 1024, parallelism: 1 }),
  );
  afterAll(() => {
    clearSessionKeyCache();
    setArgon2ParamsForTesting(originalParams);
  });
  const plain = JSON.stringify({
    task: { ids: ['a'], entities: { a: { title: 'Private café task' } } },
    archiveYoung: { task: {} },
  });
  const passphrase = 'a separate backup passphrase';
  it('round-trips the exact complete JSON without exposing its contents', async () => {
    const encrypted = await encryptBackupFile(plain, passphrase);
    expect(encrypted).not.toContain('Private café task');
    expect(await decryptBackupFile(JSON.parse(encrypted), passphrase)).toBe(plain);
  });
  it('rejects a wrong passphrase, changed ciphertext, and future file versions', async () => {
    const envelope = JSON.parse(await encryptBackupFile(plain, passphrase));
    await expectAsync(decryptBackupFile(envelope, 'wrong passphrase')).toBeRejected();
    await expectAsync(
      decryptBackupFile(
        { ...envelope, ciphertext: envelope.ciphertext.slice(0, -8) + 'AAAAAAAA' },
        passphrase,
      ),
    ).toBeRejected();
    await expectAsync(
      decryptBackupFile({ ...envelope, version: 2 }, passphrase),
    ).toBeRejected();
  });
});
