import { privateKeyToAccount } from "viem/accounts";
import { accountStorageAdapter } from "../adapters/IndexedDBStore";
import type { AccountMetadata, AccountData } from "../interfaces/IDataTypes";
import type { WalletAccountId } from "@/lib/auth";
import { IndexedDBStore } from "../adapters/IndexedDBStore";

/**
 * Derive publicKey from Master Key
 * Must remain deterministic and pure
 */
function deriveKeysFromPrivateKey(privateKey: string): {
  publicKey: string;
} {
  const hexKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(hexKey as `0x${string}`);
  return {
    publicKey: account.publicKey,
  };
}

/**
 * Full stored account record (NO Master Key)
 */
type StorageRecord = {
  id: string;
  profile: AccountMetadata;
};

function isStorageRecord(value: unknown): value is StorageRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.profile === "object" && v.profile !== null;
}

export class AccountRepository {
  constructor(private storageAdapter: IndexedDBStore) {}

  /**
   * Store account metadata (WITHOUT Master Key or derived fields)
   * Master Key is stored separately in wrapped-master-key store
   *
   * IMPORTANT: This method MERGES metadata to preserve existing fields.
   * This ensures partial updates don't drop other fields (forward-compatible).
   *
   * @param metadata - Account metadata (excludes privateKey, publicKey)
   */
  async storeAccountData(metadata: AccountMetadata): Promise<void> {
    const existing = await this.getStoredAccountRecord(metadata.accountId);

    const record: StorageRecord = {
      id: metadata.accountId,
      profile: {
        ...(existing?.profile ?? {}),
        ...metadata,
      },
    };

    await this.storageAdapter.set(record);
  }

  /**
   * Get raw stored account record (NO Master Key)
   */
  async getStoredAccountRecord(accountId: WalletAccountId): Promise<StorageRecord | null> {
    const result = (await this.storageAdapter.get(accountId)) as unknown;
    return isStorageRecord(result) ? result : null;
  }

  /**
   * Get full account data by accountId using provided Master Key.
   * Reconstructs runtime AccountData from stored metadata + Master Key.
   *
   * @param accountId - Account identifier (validated)
   * @param masterKey - Master Key (for deriving publicKey/address)
   * @returns Full account data with secrets and derived fields
   */
  async getAccountMetadata(
    accountId: WalletAccountId,
    masterKey: string
  ): Promise<AccountData | null> {
    const record = await this.getStoredAccountRecord(accountId);
    if (!record) return null;

    const { publicKey } = deriveKeysFromPrivateKey(masterKey);

    return {
      ...record.profile,
      privateKey: masterKey,
      publicKey,
    };
  }

  /**
   * Check if account exists
   */
  async accountExists(accountId: WalletAccountId): Promise<boolean> {
    return (await this.getStoredAccountRecord(accountId)) !== null;
  }
}

export const accountRepo = new AccountRepository(accountStorageAdapter);
