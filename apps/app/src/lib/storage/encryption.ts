/**
 * Storage Encryption
 *
 * AES-GCM encryption for secure IndexedDB storage.
 * Uses Web Crypto API.
 */

const CRYPTO_ALGO = "AES-GCM";
const HASH_ALGO = "SHA-256";

/**
 * Encrypted data structure for storage
 */
export interface EncryptedData {
  /** Initialization vector (12 bytes for AES-GCM) */
  iv: Uint8Array;
  /** Encrypted ciphertext */
  data: Uint8Array;
  /** Salt for key derivation */
  salt: Uint8Array;
}

/**
 * Convert binary data to base64 for storage
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer));
}

/**
 * Convert base64 back to binary data
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  return new Uint8Array(
    atob(base64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
}

/**
 * Create privacy-preserving hash for storage keys
 */
export async function createHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.toLowerCase());
  const hashBuffer = await crypto.subtle.digest(HASH_ALGO, data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Encryption Service for IndexedDB storage
 *
 * Holds encryption key in memory for session lifetime.
 */
export class EncryptionService {
  private encryptionKey: CryptoKey | null = null;

  setEncryptionKey(key: CryptoKey): void {
    this.encryptionKey = key;
  }

  clearEncryptionKey(): void {
    this.encryptionKey = null;
  }

  isKeyAvailable(): boolean {
    return this.encryptionKey !== null;
  }

  private getEncryptionKey(): CryptoKey {
    if (!this.encryptionKey) {
      throw new Error("Session not initialized - encryption key not available");
    }
    return this.encryptionKey;
  }

  async encrypt<T>(data: T): Promise<EncryptedData> {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = this.getEncryptionKey();

    const encoder = new TextEncoder();
    const jsonData = encoder.encode(JSON.stringify(data));

    const encryptedData = await crypto.subtle.encrypt(
      { name: CRYPTO_ALGO, iv } as AesGcmParams,
      key,
      jsonData
    );

    return {
      iv,
      data: new Uint8Array(encryptedData),
      salt,
    };
  }

  async decrypt<T>(encryptedData: EncryptedData): Promise<T> {
    const key = this.getEncryptionKey();

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: CRYPTO_ALGO, iv: encryptedData.iv } as AesGcmParams,
      key,
      new Uint8Array(encryptedData.data)
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(
        `Decrypted data is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
