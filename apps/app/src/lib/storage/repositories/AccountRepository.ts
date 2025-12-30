/**
 * Account Repository - Account data storage operations
 * Maintains exact logic and data compatibility with current noteCache account methods
 */

import { ethers } from "ethers";
import { EncryptionService, type EncryptedData } from "@shinobi-cash/core";
import type { IndexedDBAdapter } from "../adapters/IndexedDBAdapter";
import type { CachedAccountData } from "../interfaces/IDataTypes";

/**
 * Stored account data (without derived fields)
 * publicKey and address are derived from privateKey at runtime
 */
type StoredAccountData = Omit<CachedAccountData, "publicKey" | "address">;

/**
 * Derive publicKey and address from privateKey
 */
function deriveKeysFromPrivateKey(privateKey: string): { publicKey: string; address: string } {
  const wallet = new ethers.Wallet(privateKey);
  return {
    publicKey: wallet.signingKey.publicKey,
    address: wallet.address,
  };
}

/**
 * AccountIndex (renamed from AccountMetadata)
 * Canonical unencrypted account index for pre-auth discovery
 * Used for account listing and UX decisions before authentication
 */
export type AccountIndex = {
  id: string;
  type: "passkey" | "wallet";
  publicKeyHash: string;
  createdAt: number;
};

/**
 * @deprecated Use AccountIndex instead
 * Kept temporarily for backward compatibility during migration
 */
export type AccountMetadata = AccountIndex;

/**
 * Full storage record with encrypted payload
 */
type StorageRecord = AccountIndex & {
  encryptedPayload: { iv: string; data: string; salt: string };
};

/**
 * Legacy storage record (before type field was added)
 */
type LegacyStorageRecord = {
  id: string;
  publicKeyHash: string;
  encryptedPayload: { iv: string; data: string; salt: string };
  createdAt: number;
};

function isLegacyStorageRecord(value: unknown): value is LegacyStorageRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const payload = v.encryptedPayload as Record<string, unknown> | undefined;
  return (
    typeof v.id === "string" &&
    typeof v.publicKeyHash === "string" &&
    !!payload &&
    typeof payload.iv === "string" &&
    typeof payload.data === "string" &&
    typeof payload.salt === "string" &&
    typeof v.createdAt === "number" &&
    !v.type // Legacy records don't have type field
  );
}

function isStorageRecord(value: unknown): value is StorageRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const payload = v.encryptedPayload as Record<string, unknown> | undefined;
  return (
    typeof v.id === "string" &&
    typeof v.type === "string" &&
    (v.type === "passkey" || v.type === "wallet") &&
    typeof v.publicKeyHash === "string" &&
    !!payload &&
    typeof payload.iv === "string" &&
    typeof payload.data === "string" &&
    typeof payload.salt === "string" &&
    typeof v.createdAt === "number"
  );
}

export class AccountRepository {
  constructor(
    private storageAdapter: IndexedDBAdapter,
    private encryptionService: EncryptionService
  ) {}

  /**
   * Store account data
   */
  async storeAccountData(accountData: CachedAccountData): Promise<void> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error("Session not initialized");
    }

    // Derive publicKey from privateKey for hashing
    const { publicKey } = deriveKeysFromPrivateKey(accountData.privateKey);
    const publicKeyHash = await EncryptionService.createHash(publicKey);

    // Remove derived fields before encryption (only persist privateKey)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { publicKey: _, address: __, ...storedData } = accountData;
    const encrypted = await this.encryptionService.encrypt(storedData as StoredAccountData);

    // Determine storage key based on account type
    const storageKey = accountData.type === "passkey" ? accountData.accountName : accountData.accountId;

    const storageData: StorageRecord = {
      id: storageKey, // Use accountName for passkey, accountId for wallet
      type: accountData.type, // Store type as unencrypted metadata
      publicKeyHash,
      encryptedPayload: {
        iv: this.encryptionService.arrayBufferToBase64(encrypted.iv),
        data: this.encryptionService.arrayBufferToBase64(encrypted.data),
        salt: this.encryptionService.arrayBufferToBase64(encrypted.salt),
      },
      createdAt: accountData.createdAt,
    };

    await this.storageAdapter.set(storageData);
  }

  /**
   * Migrate legacy record to new format with type field
   * Infers type from account data structure
   */
  private async migrateLegacyRecord(legacy: LegacyStorageRecord): Promise<StorageRecord> {
    // Decrypt to determine type (requires session)
    if (!this.encryptionService.isKeyAvailable()) {
      // Cannot migrate without session - return best guess
      // Passkeys typically use account names, wallets use hashed IDs
      const type: "passkey" | "wallet" = legacy.id.length < 50 ? "passkey" : "wallet";
      const migrated: StorageRecord = {
        ...legacy,
        type,
      };
      // Save migrated record
      await this.storageAdapter.set(migrated);
      return migrated;
    }

    try {
      const encryptedData: EncryptedData = {
        iv: this.encryptionService.base64ToArrayBuffer(legacy.encryptedPayload.iv),
        data: this.encryptionService.base64ToArrayBuffer(legacy.encryptedPayload.data),
        salt: this.encryptionService.base64ToArrayBuffer(legacy.encryptedPayload.salt),
      };
      const storedData = await this.encryptionService.decrypt<StoredAccountData>(encryptedData);

      const migrated: StorageRecord = {
        ...legacy,
        type: storedData.type,
      };

      // Save migrated record
      await this.storageAdapter.set(migrated);
      return migrated;
    } catch (error) {
      console.warn("Failed to migrate legacy record, using heuristic:", error);
      // Fallback to heuristic
      const type: "passkey" | "wallet" = legacy.id.length < 50 ? "passkey" : "wallet";
      const migrated: StorageRecord = {
        ...legacy,
        type,
      };
      await this.storageAdapter.set(migrated);
      return migrated;
    }
  }

  /**
   * Get encrypted account record by name
   * Returns raw encrypted storage record without decryption
   * Automatically migrates legacy records
   */
  async getEncryptedAccountRecord(accountName: string): Promise<StorageRecord | null> {
    const result = (await this.storageAdapter.get(accountName)) as unknown;

    if (isStorageRecord(result)) {
      return result;
    }

    if (isLegacyStorageRecord(result)) {
      // Migrate legacy record
      return await this.migrateLegacyRecord(result);
    }

    return null;
  }

  /**
   * Get decrypted account data by name
   * Decrypts storage record and derives publicKey/address from privateKey
   */
  async getDecryptedAccountData(currentAccountName: string): Promise<CachedAccountData | null> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error("Session not initialized");
    }
    if (!currentAccountName) {
      throw new Error("No current account context");
    }

    const result = (await this.storageAdapter.get(currentAccountName)) as unknown;
    if (isStorageRecord(result)) {
      try {
        const encryptedData: EncryptedData = {
          iv: this.encryptionService.base64ToArrayBuffer(result.encryptedPayload.iv),
          data: this.encryptionService.base64ToArrayBuffer(result.encryptedPayload.data),
          salt: this.encryptionService.base64ToArrayBuffer(result.encryptedPayload.salt),
        };

        // Decrypt stored data (without publicKey/address)
        const storedData = await this.encryptionService.decrypt<StoredAccountData>(encryptedData);

        // Derive publicKey and address from privateKey
        const { publicKey, address } = deriveKeysFromPrivateKey(storedData.privateKey);

        // Return complete account data with derived fields
        return {
          ...storedData,
          publicKey,
          address,
        } as CachedAccountData;
      } catch (decryptionError) {
        console.error("Failed to decrypt account data:", decryptionError);
        return null;
      }
    }
    return null;
  }

  /**
   * List all account names - exact implementation from noteCache.listAccountNames
   */
  async listAccountNames(): Promise<string[]> {
    return this.storageAdapter.keys();
  }

  /**
   * Check if account exists - exact implementation from noteCache.accountExists
   */
  async accountExists(accountName: string): Promise<boolean> {
    try {
      const accountData = await this.getEncryptedAccountRecord(accountName);
      return accountData !== null;
    } catch (error) {
      console.warn("Failed to check account existence:", error);
      return false;
    }
  }

  /**
   * List account index (unencrypted account metadata)
   * Safe to call before session initialization
   */
  async listAccountIndex(): Promise<AccountIndex[]> {
    const names = await this.listAccountNames();
    const index: AccountIndex[] = [];

    for (const name of names) {
      const record = await this.getEncryptedAccountRecord(name);
      if (record) {
        index.push({
          id: record.id,
          type: record.type,
          publicKeyHash: record.publicKeyHash,
          createdAt: record.createdAt,
        });
      }
    }

    return index;
  }

  /**
   * @deprecated Use listAccountIndex() instead
   * Kept temporarily for backward compatibility during migration
   */
  async listAccountMetadata(): Promise<AccountMetadata[]> {
    return this.listAccountIndex();
  }
}
