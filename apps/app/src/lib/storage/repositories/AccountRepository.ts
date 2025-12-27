/**
 * Account Repository - Account data storage operations
 * Maintains exact logic and data compatibility with current noteCache account methods
 */

import { ethers } from "ethers";
import type { IndexedDBAdapter } from "../adapters/IndexedDBAdapter";
import type { CachedAccountData, EncryptedData } from "../interfaces/IDataTypes";
import type { EncryptionService } from "../services/EncryptionService";

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

type StorageRecord = {
  id: string;
  publicKeyHash: string;
  encryptedPayload: { iv: string; data: string; salt: string };
  createdAt: number;
};

function isStorageRecord(value: unknown): value is StorageRecord {
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
    const publicKeyHash = await this.encryptionService.createHash(publicKey);

    // Remove derived fields before encryption (only persist privateKey)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { publicKey: _, address: __, ...storedData } = accountData;
    const encrypted = await this.encryptionService.encrypt(storedData as StoredAccountData);

    // Determine storage key based on account type
    const storageKey = accountData.type === "passkey" ? accountData.accountName : accountData.accountId;

    const storageData = {
      id: storageKey, // Use accountName for passkey, accountId for wallet
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
   * Get encrypted account record by name
   * Returns raw encrypted storage record without decryption
   */
  async getEncryptedAccountRecord(accountName: string): Promise<StorageRecord | null> {
    const result = (await this.storageAdapter.get(accountName)) as unknown;
    if (isStorageRecord(result)) {
      return result;
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
}
