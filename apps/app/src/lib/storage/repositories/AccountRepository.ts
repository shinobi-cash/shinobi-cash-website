/**
 * Account Repository - Account data storage operations
 */

import { ethers } from "ethers";
import { EncryptionService } from "@shinobi-cash/core";
import type { IndexedDBAdapter } from "../adapters/IndexedDBAdapter";
import type { CachedAccountData } from "../interfaces/IDataTypes";

/**
 * Stored account metadata (NO AMK)
 * CRITICAL INVARIANT: privateKey (AMK) is NEVER stored in account metadata
 * AMK is stored ONLY in wrapped-amk store, encrypted per auth method
 * publicKey and address are derived from AMK at runtime
 */
type StoredAccountMetadata = Omit<CachedAccountData, "privateKey" | "publicKey" | "address">;

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
 * Full storage record with unencrypted metadata
 * CRITICAL: No AMK stored here, only metadata
 */
type StorageRecord = AccountIndex & {
  metadata: StoredAccountMetadata;
};

function isStorageRecord(value: unknown): value is StorageRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.type === "string" &&
    v.type === "wallet" && // Only wallet accounts exist now
    typeof v.publicKeyHash === "string" &&
    !!v.metadata &&
    typeof v.metadata === "object" &&
    typeof v.createdAt === "number"
  );
}

export class AccountRepository {
  constructor(private storageAdapter: IndexedDBAdapter) {}

  /**
   * Store account metadata (WITHOUT AMK)
   * CRITICAL: AMK (privateKey) is NOT stored here
   * AMK is stored separately in wrapped-amk store
   */
  async storeAccountData(accountData: CachedAccountData): Promise<void> {
    // Account metadata is NO LONGER encrypted with KEK
    // It's stored as plaintext metadata (publicKey hash for indexing)
    const publicKeyHash = await EncryptionService.createHash(accountData.publicKey);

    // Remove ALL secret fields (privateKey, publicKey, address)
    // Only store metadata
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { privateKey: _pk, publicKey: _pub, address: _addr, ...metadata } = accountData;

    // Use accountId as storage key (all accounts are wallet accounts now)
    const storageKey = accountData.accountId;

    const storageData: StorageRecord = {
      id: storageKey,
      type: accountData.type, // Always "wallet" now
      publicKeyHash,
      metadata: metadata as StoredAccountMetadata, // No encryption, just metadata
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

    if (!isStorageRecord(result)) {
      return null;
    }
    return result;
  }

  /**
   * Get account metadata by name (NO AMK, NO DECRYPTION)
   * Returns metadata only. Caller must provide AMK-derived fields separately.
   *
   * @param accountName - Account ID to retrieve
   * @param amk - Account Master Key (for deriving publicKey/address)
   * @returns Complete account data with derived fields
   */
  async getAccountMetadata(accountName: string, amk: string): Promise<CachedAccountData | null> {
    if (!accountName) {
      throw new Error("No account name provided");
    }

    const result = (await this.storageAdapter.get(accountName)) as unknown;
    if (isStorageRecord(result)) {
      // Derive publicKey and address from AMK
      const { publicKey, address } = deriveKeysFromPrivateKey(amk);

      // Return complete account data with derived fields
      return {
        ...result.metadata,
        privateKey: amk, // Add AMK back (in memory only)
        publicKey,
        address,
      } as CachedAccountData;
    }
    return null;
  }

  /**
   * Check if account exists - exact implementation from noteCache.accountExists
   */
  async accountExists(accountName: string): Promise<boolean> {
    return (await this.getEncryptedAccountRecord(accountName)) !== null;
  }

  /**
   * List account index (unencrypted account metadata)
   * Safe to call before session initialization
   */
  async listAccountIndex(): Promise<AccountIndex[]> {
    const names = await this.storageAdapter.keys();
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
}
