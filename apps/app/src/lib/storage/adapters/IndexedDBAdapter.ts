/**
 * IndexedDB Storage Adapter
 * Handles raw IndexedDB operations with exact same database structure as current implementation
 */

import type { IEncryptedStorageAdapter } from "../interfaces/IStorageAdapter";
import { EncryptionService } from "../services/EncryptionService";

// Database constants - exact match to current implementation
const DB_NAME = "shinobi.cash";
const DB_VERSION = 3;
const STORE_NAME = "encrypted-notes";
const ACCOUNT_STORE_NAME = "encrypted-account";
const PASSKEY_STORE_NAME = "passkey-credentials";

export class IndexedDBAdapter<T = unknown> implements IEncryptedStorageAdapter<T> {
  private db: IDBDatabase | null = null;
  private encryptionService: EncryptionService;
  private storeName: string;

  constructor(storeName: string, encryptionService: EncryptionService) {
    this.storeName = storeName;
    this.encryptionService = encryptionService;
  }

  /**
   * Initialize database - exact implementation from noteCache
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;

        // Verify all required stores exist
        if (
          !this.db.objectStoreNames.contains(STORE_NAME) ||
          !this.db.objectStoreNames.contains(ACCOUNT_STORE_NAME) ||
          !this.db.objectStoreNames.contains(PASSKEY_STORE_NAME)
        ) {
          console.warn("Some object stores are missing. Database may need to be recreated.");
        }

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);

        // Handle migration - exact implementation from noteCache
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            console.log("Creating notes store");
            const notesStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            notesStore.createIndex("publicKeyHash", "publicKeyHash", { unique: false });
            notesStore.createIndex("poolAddressHash", "poolAddressHash", { unique: false });
          }
        }

        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(ACCOUNT_STORE_NAME)) {
            console.log("Creating account store");
            const accountStore = db.createObjectStore(ACCOUNT_STORE_NAME, { keyPath: "id" });
            accountStore.createIndex("publicKeyHash", "publicKeyHash", { unique: false });
          }
        }

        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains(PASSKEY_STORE_NAME)) {
            console.log("Creating passkey store");
            const passkeyStore = db.createObjectStore(PASSKEY_STORE_NAME, {
              keyPath: "accountName",
            });
            passkeyStore.createIndex("publicKeyHash", "publicKeyHash", { unique: false });
            passkeyStore.createIndex("credentialId", "credentialId", { unique: false });
          }
        }

        console.log("Database upgrade completed");
      };
    });
  }

  /**
   * Reset database - exact implementation from noteCache
   */
  async resetDatabase(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    return new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(DB_NAME);

      deleteReq.onerror = () => reject(deleteReq.error);
      deleteReq.onsuccess = () => {
        console.log("Database deleted successfully");
        this.init().then(resolve).catch(reject);
      };
      deleteReq.onblocked = () => {
        console.warn("Database deletion blocked. Close other tabs/windows using this app.");
      };
    });
  }

  /**
   * Initialize session with encryption key
   */
  async initializeSession(encryptionKey: CryptoKey): Promise<void> {
    this.encryptionService.setEncryptionKey(encryptionKey);
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Clear session
   */
  clearSession(): void {
    this.encryptionService.clearEncryptionKey();
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.encryptionService.isKeyAvailable();
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction([this.storeName], "readonly");
      if (!transaction) {
        reject(new Error("Database transaction could not be created"));
        return;
      }
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * Set value - IndexedDB uses object's keyPath property as key
   */
  async set(value: T): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction([this.storeName], "readwrite");
      if (!transaction) {
        reject(new Error("Database transaction could not be created"));
        return;
      }

      // Check if store exists
      if (!this.db?.objectStoreNames.contains(this.storeName)) {
        reject(
          new Error(
            `Database corruption: ${this.storeName} object store missing. Try clearing browser data.`
          )
        );
        return;
      }

      const store = transaction.objectStore(this.storeName);
      const request = store.put(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Remove value by key
   */
  async remove(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction([this.storeName], "readwrite");
      if (!transaction) {
        reject(new Error("Database transaction could not be created"));
        return;
      }
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all data in store
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction([this.storeName], "readwrite");
      if (!transaction) {
        reject(new Error("Failed to create transaction"));
        return;
      }
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null;
    } catch (error) {
      console.warn(`Failed to check ${key} existence:`, error);
      return false;
    }
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction([this.storeName], "readonly");
      if (!transaction) {
        reject(new Error("Failed to create transaction"));
        return;
      }
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }

  /**
   * Clear all stores - for complete data wipe
   */
  async clearAllStores(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db?.transaction(
        [STORE_NAME, ACCOUNT_STORE_NAME, PASSKEY_STORE_NAME],
        "readwrite"
      );
      if (!transaction) {
        reject(new Error("Failed to create transaction"));
        return;
      }

      const notesStore = transaction.objectStore(STORE_NAME);
      const accountStore = transaction.objectStore(ACCOUNT_STORE_NAME);
      const passkeyStore = transaction.objectStore(PASSKEY_STORE_NAME);

      let completed = 0;
      const total = 3;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      const notesRequest = notesStore.clear();
      const accountRequest = accountStore.clear();
      const passkeyRequest = passkeyStore.clear();

      notesRequest.onerror = () => reject(notesRequest.error);
      notesRequest.onsuccess = checkComplete;

      accountRequest.onerror = () => reject(accountRequest.error);
      accountRequest.onsuccess = checkComplete;

      passkeyRequest.onerror = () => reject(passkeyRequest.error);
      passkeyRequest.onsuccess = checkComplete;
    });
  }
}

// Create shared encryption service
const sharedEncryptionService = new EncryptionService();

// Create store-specific adapters
export const notesStorageAdapter = new IndexedDBAdapter(STORE_NAME, sharedEncryptionService);
export const accountStorageAdapter = new IndexedDBAdapter(
  ACCOUNT_STORE_NAME,
  sharedEncryptionService
);
export const passkeyStorageAdapter = new IndexedDBAdapter(
  PASSKEY_STORE_NAME,
  sharedEncryptionService
);

// Export shared encryption service for repositories
export { sharedEncryptionService };
