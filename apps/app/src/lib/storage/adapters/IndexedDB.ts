/**
 * IndexedDBDatabase
 * Owns database lifecycle, schema, and dev resets.
 */

const DB_NAME = "shinobi.cash";
const DB_VERSION = 3;

const STORES = {
  NOTES: "encrypted-notes",
  ACCOUNTS: "account-metadata",
  WRAPPED_AMK: "wrapped-amk",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

class IndexedDBDatabase {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () => reject(req.error);

      req.onupgradeneeded = (event) => {
        const db = req.result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;

        // Create new stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          db.createObjectStore(STORES.NOTES, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
          db.createObjectStore(STORES.ACCOUNTS, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.WRAPPED_AMK)) {
          db.createObjectStore(STORES.WRAPPED_AMK, { keyPath: "id" });
        }

        // Migration: Rename old "encrypted-account" to "account-metadata"
        if (db.objectStoreNames.contains("encrypted-account")) {
          const oldStore = transaction.objectStore("encrypted-account");
          const newStore = db.objectStoreNames.contains(STORES.ACCOUNTS)
            ? transaction.objectStore(STORES.ACCOUNTS)
            : db.createObjectStore(STORES.ACCOUNTS, { keyPath: "id" });

          // Copy all data from old store to new store
          const getAllRequest = oldStore.getAll();
          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;
            records.forEach((record) => {
              newStore.put(record);
            });
          };

          // Delete old store after migration
          db.deleteObjectStore("encrypted-account");
        }

        // Remove deprecated passkey-credentials store
        if (db.objectStoreNames.contains("passkey-credentials")) {
          db.deleteObjectStore("passkey-credentials");
        }
      };

      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };
    });
  }

  async reset(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }
}

export const indexedDBDatabase = new IndexedDBDatabase();
export { STORES };
