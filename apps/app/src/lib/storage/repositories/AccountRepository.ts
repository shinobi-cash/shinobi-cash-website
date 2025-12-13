/**
 * Account Repository - Account data storage operations
 * Maintains exact logic and data compatibility with current noteCache account methods
 */

import { restoreFromMnemonic } from "@shinobi-cash/core";
import type { IndexedDBAdapter } from "../adapters/IndexedDBAdapter";
import type { CachedAccountData, EncryptedData } from "../interfaces/IDataTypes";
import type { EncryptionService } from "../services/EncryptionService";

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
    private encryptionService: EncryptionService,
  ) {}

  /**
   * Store account data - exact implementation from noteCache.storeAccountData
   */
  async storeAccountData(accountData: CachedAccountData): Promise<void> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error("Session not initialized");
    }

    // Derive public key from mnemonic for indexing
    const { publicKey } = restoreFromMnemonic(accountData.mnemonic);

    const encrypted = await this.encryptionService.encrypt(accountData);
    const publicKeyHash = await this.encryptionService.createHash(publicKey);

    const storageData = {
      id: accountData.accountName, // Use account name as primary key
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
   * Get account data by name - exact implementation from noteCache.getAccountDataByName
   */
  async getAccountDataByName(accountName: string): Promise<StorageRecord | null> {
    const result = (await this.storageAdapter.get(accountName)) as unknown;
    if (isStorageRecord(result)) {
      // Return the raw encrypted data for now - matches current implementation
      return result;
    }
    return null;
  }

  /**
   * Get current account data - exact implementation from noteCache.getAccountData
   */
  async getAccountData(currentAccountName: string): Promise<CachedAccountData | null> {
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

        const decryptedData = await this.encryptionService.decrypt<CachedAccountData>(encryptedData);
        return decryptedData;
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
      const accountData = await this.getAccountDataByName(accountName);
      return accountData !== null;
    } catch (error) {
      console.warn("Failed to check account existence:", error);
      return false;
    }
  }
}
