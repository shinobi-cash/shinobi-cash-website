/**
 * IndexedDBStore
 * Store-scoped IndexedDB adapter with encryption binding.
 *
 * Responsibilities:
 * - CRUD for ONE store
 * - Encryption key session
 */
import { EncryptionService } from "@shinobi-cash/core";
import { indexedDBDatabase, StoreName, STORES } from "./IndexedDB";
import { IEncryptedStorageAdapter } from "./types";

export class IndexedDBStore<T = unknown> implements IEncryptedStorageAdapter<T> {
  private encryptionService: EncryptionService;

  constructor(private readonly storeName: StoreName) {
    this.encryptionService = new EncryptionService();
  }

  /* ---------- Session / Encryption ---------- */

  async initializeSession(key: CryptoKey): Promise<void> {
    this.encryptionService.setEncryptionKey(key);
  }

  clearSession(): void {
    this.encryptionService.clearEncryptionKey();
  }

  isSessionActive(): boolean {
    return this.encryptionService.isKeyAvailable();
  }

  getEncryptionService(): EncryptionService {
    return this.encryptionService;
  }

  /* ---------- Internal ---------- */

  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await indexedDBDatabase.open();
    return db.transaction(this.storeName, mode).objectStore(this.storeName);
  }

  /* ---------- CRUD ---------- */

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async get(key: string): Promise<T | null> {
    const store = await this.getStore("readonly");
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result ?? null);
    });
  }

  async set(value: T): Promise<void> {
    const store = await this.getStore("readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(value);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async remove(key: string): Promise<void> {
    const store = await this.getStore("readwrite");
    store.delete(key);
  }

  async clear(): Promise<void> {
    const store = await this.getStore("readwrite");
    store.clear();
  }

  async keys(): Promise<string[]> {
    const store = await this.getStore("readonly");
    return new Promise((resolve) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
    });
  }
}

// Create store-specific adapters with their own encryption services
export const notesStorageAdapter = new IndexedDBStore(STORES.NOTES);
export const accountStorageAdapter = new IndexedDBStore(STORES.ACCOUNTS);
export const AMKStorageAdapter = new IndexedDBStore(STORES.WRAPPED_AMK);

// Export notes encryption service for repositories (they need to access it directly)
export const sharedEncryptionService = new EncryptionService();
