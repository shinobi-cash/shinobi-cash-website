/**
 * Encryption Service - Pure crypto operations
 *
 * Provides AES-GCM encryption/decryption and privacy-preserving hashing.
 * Uses Web Crypto API (available in browsers and Node.js 15+).
 */

const CRYPTO_ALGO = 'AES-GCM';
const HASH_ALGO = 'SHA-256';

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Initialization vector */
  iv: Uint8Array;

  /** Encrypted data */
  data: Uint8Array;

  /** Salt used for key derivation */
  salt: Uint8Array;
}

/**
 * Encryption Service
 *
 * Handles encryption/decryption of sensitive data using AES-GCM.
 *
 * @example
 * ```typescript
 * const service = new EncryptionService();
 *
 * // Set encryption key (derived from password/passkey)
 * service.setEncryptionKey(cryptoKey);
 *
 * // Encrypt data
 * const encrypted = await service.encrypt({ sensitive: "data" });
 *
 * // Decrypt data
 * const decrypted = await service.decrypt<{ sensitive: string }>(encrypted);
 * ```
 */
export class EncryptionService {
  private encryptionKey: CryptoKey | null = null;

  /**
   * Initialize with encryption key
   *
   * @param key - CryptoKey for AES-GCM encryption
   */
  setEncryptionKey(key: CryptoKey): void {
    this.encryptionKey = key;
  }

  /**
   * Clear encryption key from memory
   */
  clearEncryptionKey(): void {
    this.encryptionKey = null;
  }

  /**
   * Check if encryption key is available
   *
   * @returns true if key is set
   */
  isKeyAvailable(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Get the stored encryption key
   * @private
   */
  private getEncryptionKey(): CryptoKey {
    if (!this.encryptionKey) {
      throw new Error('Session not initialized - encryption key not available');
    }
    return this.encryptionKey;
  }

  /**
   * Create privacy-preserving hash for indexing
   *
   * Uses SHA-256 to create deterministic hashes for lookup keys
   * without exposing the original values.
   *
   * @param input - String to hash
   * @returns Hex-encoded hash
   *
   * @example
   * ```typescript
   * const hash = await EncryptionService.createHash("user@example.com");
   * ```
   */
  static async createHash(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input.toLowerCase());
    const hashBuffer = await crypto.subtle.digest(HASH_ALGO, data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Encrypt sensitive data
   *
   * Uses AES-GCM with random IV and salt for each encryption.
   *
   * @param data - Data to encrypt (will be JSON stringified)
   * @returns Encrypted data with IV and salt
   *
   * @example
   * ```typescript
   * const encrypted = await service.encrypt({ privateKey: "0x..." });
   * // Store encrypted.data, encrypted.iv, encrypted.salt
   * ```
   */
  async encrypt<T>(data: T): Promise<EncryptedData> {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = this.getEncryptionKey();

    const encoder = new TextEncoder();
    const jsonData = encoder.encode(JSON.stringify(data));

    const encryptedData = await crypto.subtle.encrypt({ name: CRYPTO_ALGO, iv: iv } as AesGcmParams, key, jsonData);

    return {
      iv,
      data: new Uint8Array(encryptedData),
      salt,
    };
  }

  /**
   * Decrypt sensitive data
   *
   * @param encryptedData - Encrypted data with IV and salt
   * @returns Decrypted and JSON parsed data
   *
   * @example
   * ```typescript
   * const decrypted = await service.decrypt<{ privateKey: string }>(encrypted);
   * console.log(decrypted.privateKey);
   * ```
   */
  async decrypt<T>(encryptedData: EncryptedData): Promise<T> {
    const key = this.getEncryptionKey();

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: CRYPTO_ALGO, iv: encryptedData.iv } as AesGcmParams,
      key,
      new Uint8Array(encryptedData.data),
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  }

  /**
   * Convert binary data to base64 for storage
   *
   * @param buffer - Binary data
   * @returns Base64 encoded string
   */
  arrayBufferToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer));
  }

  /**
   * Convert base64 back to binary data
   *
   * @param base64 - Base64 encoded string
   * @returns Binary data
   */
  base64ToArrayBuffer(base64: string): Uint8Array {
    return new Uint8Array(
      atob(base64)
        .split('')
        .map((c) => c.charCodeAt(0)),
    );
  }
}
