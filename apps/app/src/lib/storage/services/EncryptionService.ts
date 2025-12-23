/**
 * Encryption Service - Pure crypto operations
 * Extracted from noteCache.ts to separate encryption from storage concerns
 */

import type { EncryptedData } from "../interfaces/IDataTypes";

const CRYPTO_ALGO = "AES-GCM";
const HASH_ALGO = "SHA-256";

export class EncryptionService {
  private encryptionKey: CryptoKey | null = null;

  /**
   * Initialize with encryption key
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
   */
  isKeyAvailable(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Get the stored encryption key
   */
  private getEncryptionKey(): CryptoKey {
    if (!this.encryptionKey) {
      throw new Error("Session not initialized - encryption key not available");
    }
    return this.encryptionKey;
  }

  /**
   * Create privacy-preserving hash for indexing - exact implementation from noteCache
   */
  async createHash(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input.toLowerCase());
    const hashBuffer = await crypto.subtle.digest(HASH_ALGO, data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Encrypt sensitive data - exact implementation from noteCache
   */
  async encrypt<T>(data: T): Promise<EncryptedData> {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = this.getEncryptionKey();

    const encoder = new TextEncoder();
    const jsonData = encoder.encode(JSON.stringify(data));

    const encryptedData = await crypto.subtle.encrypt(
      { name: CRYPTO_ALGO, iv: iv } as AesGcmParams,
      key,
      jsonData
    );

    return {
      iv,
      data: new Uint8Array(encryptedData),
      salt,
    };
  }

  /**
   * Decrypt sensitive data - exact implementation from noteCache
   */
  async decrypt<T>(encryptedData: EncryptedData): Promise<T> {
    const key = this.getEncryptionKey();

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: CRYPTO_ALGO, iv: encryptedData.iv } as AesGcmParams,
      key,
      new Uint8Array(encryptedData.data)
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  }

  /**
   * Convert binary data to base64 for storage - exact implementation from noteCache
   */
  arrayBufferToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer));
  }

  /**
   * Convert base64 back to binary data - exact implementation from noteCache
   */
  base64ToArrayBuffer(base64: string): Uint8Array {
    return new Uint8Array(
      atob(base64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
  }
}
