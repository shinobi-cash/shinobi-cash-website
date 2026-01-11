/**
 * Base Storage Interface
 * Defines common operations for all storage adapters
 */
export interface IStorageAdapter<T = unknown> {
  get(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
}

/**
 * Key-Value Storage Interface
 * For storage that supports key-value operations (localStorage, sessionStorage)
 */
export interface IBrowserStorageAdapter<T = unknown> extends IStorageAdapter<T> {
  set(key: string, value: T): Promise<void>;
}

/**
 * Encrypted Storage Interface
 * For storage that requires encryption/decryption
 */
export interface IEncryptedStorageAdapter<T = unknown> extends IStorageAdapter<T> {
  set(value: T): Promise<void>;
  initializeSession(encryptionKey: CryptoKey): Promise<void>;
  clearSession(): void;
  isSessionActive(): boolean;
}
