import { encrypt, decrypt } from '@sp/sync-core';

export const ENCRYPTED_BACKUP_FORMAT = 'ultra-tasks-encrypted-backup';

/** File-only envelope: the decrypted payload is the existing complete JSON backup. */
export const encryptBackupFile = async (
  json: string,
  passphrase: string,
): Promise<string> =>
  JSON.stringify({
    format: ENCRYPTED_BACKUP_FORMAT,
    version: 1,
    algorithm: 'argon2id-aes-gcm',
    ciphertext: await encrypt(json, passphrase),
  });

export const decryptBackupFile = async (
  value: unknown,
  passphrase: string,
): Promise<string> => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('format' in value) ||
    value.format !== ENCRYPTED_BACKUP_FORMAT ||
    !('version' in value) ||
    value.version !== 1 ||
    !('algorithm' in value) ||
    value.algorithm !== 'argon2id-aes-gcm' ||
    !('ciphertext' in value) ||
    typeof value.ciphertext !== 'string'
  ) {
    throw new Error('Unsupported encrypted backup format');
  }
  return decrypt(value.ciphertext, passphrase);
};
