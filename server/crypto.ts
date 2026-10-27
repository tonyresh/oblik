import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const SALT_LENGTH = 16;
const TAG_LENGTH = 16; // 128-bit authentication tag
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedPayload {
  _encrypted: true;
  version: '2.0';
  algorithm: string;
  kdf: string;
  iterations: number;
  salt: string;       // hex
  iv: string;         // hex
  authTag: string;    // hex
  ciphertext: string; // base64
  checksum: string;   // sha256 of original plaintext
  timestamp: string;  // ISO string
}

export class DatabaseCrypto {
  private masterKeyPath: string;
  private cachedMasterSecret: string | null = null;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        console.error('[Crypto] Failed to create data dir:', e);
      }
    }
    this.masterKeyPath = path.join(dataDir, '.master_key');
    this.initMasterKey();
  }

  private initMasterKey(): string {
    // 1. Environment variable if set
    if (process.env.DATABASE_ENCRYPTION_KEY && process.env.DATABASE_ENCRYPTION_KEY.length >= 16) {
      this.cachedMasterSecret = process.env.DATABASE_ENCRYPTION_KEY;
      return this.cachedMasterSecret;
    }

    // 2. Persistent machine key file
    if (fs.existsSync(this.masterKeyPath)) {
      try {
        const stored = fs.readFileSync(this.masterKeyPath, 'utf8').trim();
        if (stored.length >= 32) {
          this.cachedMasterSecret = stored;
          return stored;
        }
      } catch (err) {
        console.error('[Crypto] Failed to read master key file:', err);
      }
    }

    // 3. Generate a new cryptographically secure 256-bit key
    const generated = crypto.randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(this.masterKeyPath, generated, { encoding: 'utf8', mode: 0o600 });
      console.log('[Crypto] Generated new 256-bit AES master encryption key in data/.master_key');
    } catch (err) {
      console.error('[Crypto] Failed to persist master key to disk:', err);
    }
    this.cachedMasterSecret = generated;
    return generated;
  }

  public getMasterSecret(): string {
    if (!this.cachedMasterSecret) {
      return this.initMasterKey();
    }
    return this.cachedMasterSecret;
  }

  public getKeyFingerprint(): string {
    const secret = this.getMasterSecret();
    return crypto.createHash('sha256').update(secret).digest('hex').substring(0, 16).toUpperCase();
  }

  /**
   * Derive a 256-bit key using PBKDF2 with SHA-256
   */
  private deriveKey(secret: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  }

  /**
   * Encrypt arbitrary JavaScript object or string with AES-256-GCM
   */
  public encrypt(data: any, customPassphrase?: string): EncryptedPayload {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const secret = customPassphrase || this.getMasterSecret();
    const key = this.deriveKey(secret, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let ciphertext = cipher.update(jsonStr, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    const checksum = crypto.createHash('sha256').update(jsonStr, 'utf8').digest('hex');

    return {
      _encrypted: true,
      version: '2.0',
      algorithm: ALGORITHM,
      kdf: 'pbkdf2-sha256',
      iterations: PBKDF2_ITERATIONS,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext,
      checksum,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Decrypt AES-256-GCM encrypted payload, verifying GCM authentication tag
   */
  public decrypt<T = any>(payload: EncryptedPayload | any, customPassphrase?: string): T {
    if (!payload || !payload._encrypted) {
      // If it's not encrypted, return as is
      return payload as T;
    }

    const salt = Buffer.from(payload.salt, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const secret = customPassphrase || this.getMasterSecret();
    const key = this.deriveKey(secret, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Verify SHA-256 checksum if present
    if (payload.checksum) {
      const calcChecksum = crypto.createHash('sha256').update(decrypted, 'utf8').digest('hex');
      if (calcChecksum !== payload.checksum) {
        throw new Error('Integrity verification failed: checksum mismatch');
      }
    }

    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return decrypted as unknown as T;
    }
  }

  /**
   * Encrypt and write to file with atomic write
   */
  public writeEncryptedFile(filePath: string, data: any, customPassphrase?: string): boolean {
    try {
      const payload = this.encrypt(data, customPassphrase);
      const json = JSON.stringify(payload, null, 2);
      const tmpPath = `${filePath}.tmp_${Date.now()}`;
      fs.writeFileSync(tmpPath, json, 'utf8');
      fs.renameSync(tmpPath, filePath);
      return true;
    } catch (err) {
      console.error(`[Crypto] Failed to write encrypted file ${filePath}:`, err);
      return false;
    }
  }

  /**
   * Read and decrypt file. Handles both encrypted files and unencrypted legacy files.
   */
  public readEncryptedFile<T = any>(filePath: string, customPassphrase?: string): T | null {
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);

      if (parsed && parsed._encrypted === true) {
        return this.decrypt<T>(parsed, customPassphrase);
      }

      // Legacy plaintext file
      return parsed as T;
    } catch (err) {
      console.error(`[Crypto] Failed to read/decrypt file ${filePath}:`, err);
      return null;
    }
  }

  /**
   * Verify integrity of an encrypted payload or file
   */
  public verifyIntegrity(payload: EncryptedPayload | any): { valid: boolean; error?: string; timestamp?: string; algorithm?: string } {
    try {
      if (!payload || !payload._encrypted) {
        return { valid: false, error: 'Файл не має формату шифрування' };
      }
      this.decrypt(payload);
      return {
        valid: true,
        timestamp: payload.timestamp,
        algorithm: payload.algorithm || ALGORITHM
      };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Помилка валідації тегу аутентифікації GCM' };
    }
  }

  public getStatus() {
    return {
      enabled: true,
      algorithm: ALGORITHM.toUpperCase(),
      keyFingerprint: this.getKeyFingerprint(),
      kdf: `PBKDF2-HMAC-SHA256 (${PBKDF2_ITERATIONS.toLocaleString()} ітерацій)`,
      mode: 'GCM Authenticated Encryption (128-bit MAC Tag)',
      keyLength: KEY_LENGTH * 8,
      ivLength: IV_LENGTH * 8,
      hasMasterKey: true,
      lastCheck: new Date().toISOString()
    };
  }
}

export const dbCrypto = new DatabaseCrypto();
