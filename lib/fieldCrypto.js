import crypto from 'crypto';

const ENC_ALGO = 'aes-256-gcm';

function getEncryptionKey() {
  const key = process.env.SECURITY_ENCRYPTION_KEY || '';
  const normalized = key.length === 64 && /^[0-9a-f]+$/i.test(key)
    ? Buffer.from(key, 'hex')
    : Buffer.from(key, 'utf8');

  if (normalized.length !== 32) {
    throw new Error('SECURITY_ENCRYPTION_KEY must be exactly 32 bytes (or 64-char hex).');
  }
  return normalized;
}

export function encryptSensitiveValue(plainText) {
  const value = String(plainText || '');
  if (!value) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSensitiveValue(cipherText) {
  const value = String(cipherText || '');
  if (!value) return '';
  const [ivHex, tagHex, dataHex] = value.split(':');
  if (!ivHex || !tagHex || !dataHex) return '';

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ENC_ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
