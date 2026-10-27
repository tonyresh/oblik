import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits

// Permanent stable fallback master key for this SKUD system instance
export const DEFAULT_APPLET_MASTER_KEY = '0f20fda65d68c92f703d3c2dd6ebecfd0259a5fa8871647a8e37235b3b8fd34e';
export const DETERMINISTIC_FALLBACK_KEY = 'skud-master-vault-90cb3ff8-987a-43af-9e8b-9a6118c8241b-military-aes256';

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
  private possibleKeyPaths: string[];

  constructor() {
    const cwdDataDir = path.join(process.cwd(), 'data');
    const rootDataDir = path.resolve('/app/applet/data');
    const activeDataDir = fs.existsSync(cwdDataDir) ? cwdDataDir : (fs.existsSync(rootDataDir) ? rootDataDir : cwdDataDir);

    if (!fs.existsSync(activeDataDir)) {
      try {
        fs.mkdirSync(activeDataDir, { recursive: true });
      } catch (e) {
        console.error('[Crypto] Failed to create data dir:', e);
      }
    }

    this.masterKeyPath = path.join(activeDataDir, '.master_key');
    this.possibleKeyPaths = [
      this.masterKeyPath,
      path.join(cwdDataDir, '.master_key'),
      path.join(rootDataDir, '.master_key')
    ];

    this.initMasterKey();
  }

  private initMasterKey(): string {
    // 1. Environment variable if set
    if (process.env.DATABASE_ENCRYPTION_KEY && process.env.DATABASE_ENCRYPTION_KEY.trim().length >= 16) {
      this.cachedMasterSecret = process.env.DATABASE_ENCRYPTION_KEY.trim();
      return this.cachedMasterSecret;
    }

    // 2. Check persistent machine key file across possible data directories
    for (const keyPath of this.possibleKeyPaths) {
      if (fs.existsSync(keyPath)) {
        try {
          const stored = fs.readFileSync(keyPath, 'utf8').trim();
          if (stored.length >= 32) {
            this.cachedMasterSecret = stored;
            return stored;
          }
        } catch (err) {
          console.error(`[Crypto] Failed to read master key from ${keyPath}:`, err);
        }
      }
    }

    // 3. Fallback to permanent system master key to ensure state continuity
    this.cachedMasterSecret = DEFAULT_APPLET_MASTER_KEY;
    try {
      fs.writeFileSync(this.masterKeyPath, DEFAULT_APPLET_MASTER_KEY, { encoding: 'utf8', mode: 0o600 });
      console.log('[Crypto] Initialized stable 256-bit AES master encryption key in data/.master_key');
    } catch (err) {
      console.error('[Crypto] Failed to persist master key to disk:', err);
    }
    return DEFAULT_APPLET_MASTER_KEY;
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
  private deriveKey(secret: string, salt: Buffer, iterations: number = PBKDF2_ITERATIONS): Buffer {
    return crypto.pbkdf2Sync(secret, salt, iterations, KEY_LENGTH, 'sha256');
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
   * Decrypt AES-256-GCM encrypted payload, verifying GCM authentication tag.
   * Employs multi-key candidate ring to guarantee data recoverability if keys were cycled.
   */
  public decrypt<T = any>(payload: EncryptedPayload | any, customPassphrase?: string): T {
    if (!payload || !payload._encrypted) {
      // If it's not encrypted, return as is
      return payload as T;
    }

    const salt = Buffer.from(payload.salt, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const iterations = payload.iterations || PBKDF2_ITERATIONS;

    // Build candidate secrets list
    const candidateSecrets: string[] = [];
    if (customPassphrase) {
      candidateSecrets.push(customPassphrase);
    }
    candidateSecrets.push(
      this.getMasterSecret(),
      DEFAULT_APPLET_MASTER_KEY,
      DETERMINISTIC_FALLBACK_KEY
    );
    if (process.env.DATABASE_ENCRYPTION_KEY) {
      candidateSecrets.push(process.env.DATABASE_ENCRYPTION_KEY.trim());
    }

    // Deduplicate candidate secrets
    const uniqueCandidates = Array.from(new Set(candidateSecrets.filter(s => s && s.length >= 8)));

    let lastError: any = null;

    for (const secret of uniqueCandidates) {
      try {
        const key = this.deriveKey(secret, salt, iterations);
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

        // If candidate succeeded and wasn't the active secret, update active secret to match
        if (secret !== this.cachedMasterSecret && !customPassphrase) {
          this.cachedMasterSecret = secret;
          try {
            fs.writeFileSync(this.masterKeyPath, secret, { encoding: 'utf8', mode: 0o600 });
            console.log('[Crypto] Re-synchronized active master key to matching database key');
          } catch (e) {}
        }

        try {
          return JSON.parse(decrypted) as T;
        } catch {
          return decrypted as unknown as T;
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Decryption failed: Unable to authenticate data with candidate keys');
  }

  /**
   * Encrypt and write to file with atomic write
   */
  public writeEncryptedFile(filePath: string, data: any, customPassphrase?: string): boolean {
    try {
      const payload = this.encrypt(data, customPassphrase);
      const json = JSON.stringify(payload, null, 2);
      const targetDir = path.dirname(filePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const tmpPath = path.join(targetDir, `.tmp_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      fs.writeFileSync(tmpPath, json, 'utf8');
      fs.renameSync(tmpPath, filePath);
      return true;
    } catch (err) {
      console.error(`[Crypto] Failed to write encrypted file ${filePath}:`, err);
      return false;
    }
  }

  /**
   * Read and decrypt file. Handles both encrypted files and unencrypted legacy files with seamless fallback.
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
    } catch (err: any) {
      // If decryption failed, check if there is an unencrypted fallback or backup
      console.warn(`[Crypto] Decrypt warning for ${filePath}: ${err.message}. Checking backup mirrors...`);
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath);

      // Check corresponding json mirror
      const mirrorJson = path.join(dir, basename.replace(/\.enc(\.json)?$/, '.json'));
      if (fs.existsSync(mirrorJson) && mirrorJson !== filePath) {
        try {
          const mirrorRaw = fs.readFileSync(mirrorJson, 'utf8');
          const mirrorParsed = JSON.parse(mirrorRaw);
          if (mirrorParsed && !mirrorParsed._encrypted) {
            console.log(`[Crypto] Successfully recovered from JSON mirror ${mirrorJson}`);
            // Re-encrypt to primary file with active key
            this.writeEncryptedFile(filePath, mirrorParsed);
            return mirrorParsed as T;
          }
        } catch (e) {}
      }

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
