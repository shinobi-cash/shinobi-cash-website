const DB_NAME = "shinobi.cash";
const DB_VERSION = 1;

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

      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore(STORES.NOTES, { keyPath: "id" });
        db.createObjectStore(STORES.ACCOUNTS, { keyPath: "id" });
        db.createObjectStore(STORES.MASTER_KEY, { keyPath: "id" });
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
