const DB_NAME = "shinobi.cash";
const DB_VERSION = 4;

const STORES = {
  NOTES: "encrypted-notes",
  ACCOUNTS: "account-metadata",
  MASTER_KEY: "wrapped-master-key",
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

        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          db.createObjectStore(STORES.NOTES, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
          db.createObjectStore(STORES.ACCOUNTS, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.MASTER_KEY)) {
          db.createObjectStore(STORES.MASTER_KEY, { keyPath: "id" });
        }

        // Migrate v3 → v4: rename "wrapped-amk" → "wrapped-master-key"
        if (db.objectStoreNames.contains("wrapped-amk")) {
          const oldStore = transaction.objectStore("wrapped-amk");
          const newStore = db.objectStoreNames.contains(STORES.MASTER_KEY)
            ? transaction.objectStore(STORES.MASTER_KEY)
            : db.createObjectStore(STORES.MASTER_KEY, { keyPath: "id" });

          const getAllRequest = oldStore.getAll();
          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;
            records.forEach((record: { id?: string; [key: string]: unknown }) => {
              // Rewrite storage keys: "accountId:amk:method" → "accountId:mk:method"
              if (record.id) {
                record.id = record.id.replace(":amk:", ":mk:");
              }
              newStore.put(record);
            });
          };

          db.deleteObjectStore("wrapped-amk");
        }

        if (db.objectStoreNames.contains("encrypted-account")) {
          const oldStore = transaction.objectStore("encrypted-account");
          const newStore = db.objectStoreNames.contains(STORES.ACCOUNTS)
            ? transaction.objectStore(STORES.ACCOUNTS)
            : db.createObjectStore(STORES.ACCOUNTS, { keyPath: "id" });

          const getAllRequest = oldStore.getAll();
          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;
            records.forEach((record) => {
              newStore.put(record);
            });
          };

          db.deleteObjectStore("encrypted-account");
        }

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
