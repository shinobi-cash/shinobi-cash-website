/**
 * file: shinobi-cash-website/apps/app/src/lib/storage/StorageManager.ts
 * Storage Manager - Main coordinator for all storage operations
 * Canonical storage coordinator
 */

import { fetchActivities } from "@/services/data/indexerService";
import type { DiscoveryResult, DiscoveryOptions, NoteChain } from "@shinobi-cash/core";
import type { Activity } from "@shinobi-cash/data";
import { localStorageAdapter, sessionStorageAdapter } from "./adapters/BrowserStorageAdapter";
import {
  accountStorageAdapter,
  notesStorageAdapter,
  passkeyStorageAdapter,
  wrappedAMKStorageAdapter,
  sharedEncryptionService,
} from "./adapters/IndexedDBAdapter";
import type { CachedAccountData, NamedPasskeyData } from "./interfaces/IDataTypes";
import { AccountRepository } from "./repositories/AccountRepository";
import { NotesRepository } from "./repositories/NotesRepository";
import { PasskeyRepository } from "./repositories/PasskeyRepository";
import { SessionRepository } from "./repositories/SessionRepository";
import { WrappedAMKRepository } from "./repositories/WrappedAMKRepository";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

class StorageManager {
  private notesRepo: NotesRepository;
  private accountRepo: AccountRepository;
  private passkeyRepo: PasskeyRepository;
  private sessionRepo: SessionRepository;
  private wrappedAMKRepo: WrappedAMKRepository;
  private currentAccountName: string | null = null;
  private currentAMK: string | null = null; // In-memory AMK for active session

  constructor() {
    this.notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
    this.accountRepo = new AccountRepository(accountStorageAdapter);
    this.passkeyRepo = new PasskeyRepository(passkeyStorageAdapter);
    this.sessionRepo = new SessionRepository(localStorageAdapter, sessionStorageAdapter);
    this.wrappedAMKRepo = new WrappedAMKRepository(
      wrappedAMKStorageAdapter,
      wrappedAMKStorageAdapter.getEncryptionService()
    );
  }

  async importWalletKEK(encryptionKey: Uint8Array): Promise<CryptoKey> {
    const keyBytes = new Uint8Array(encryptionKey);
    return await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  }

  // ============ SESSION MANAGEMENT ============

  /**
   * Session is considered initialized IFF:
   * - DEK is active (sharedEncryptionService)
   * - currentAccountName is set
   * - currentAMK is set in memory
   *
   * No persistent session markers are trusted.
   *
   * @param accountName - Account identifier
   * @param amkPrivateKey - Account Master Key (unwrapped from KEK)
   */
  async initializeAccountSession(accountName: string, amkPrivateKey: string): Promise<void> {
    // 1️⃣ Entry + invariant check
    if (!amkPrivateKey || amkPrivateKey.length !== 66) {
      throw new Error("CRITICAL: initializeAccountSession called without valid AMK");
    }

    console.debug("[StorageManager][Session] Finalizing session", { accountName });

    this.currentAccountName = accountName;
    this.currentAMK = amkPrivateKey; // Store AMK in memory for session

    // 2️⃣ Derive DEK from AMK
    console.debug("[StorageManager][Session] Deriving DEK from AMK");

    const { KDF } = await import("./services/KeyDerivationService");
    const dek = await KDF.deriveDataEncryptionKey(amkPrivateKey);

    // 3️⃣ Activate DEK (notes layer)
    sharedEncryptionService.setEncryptionKey(dek);
    await notesStorageAdapter.initializeSession(dek);

    console.debug("[StorageManager][Session] Notes encryption initialized (DEK active)", {
      dekReady: sharedEncryptionService.isKeyAvailable(),
    });

    // 5️⃣ Final invariant check before marking session
    if (!sharedEncryptionService.isKeyAvailable()) {
      throw new Error("CRITICAL: Session initialization incomplete (DEK missing)");
    }

    console.debug("[StorageManager][Session] Session fully initialized", {
      accountName,
      amk: "in-memory",
      dek: "active",
    });
  }

  /**
   * Save wallet-based account data with auto-generated display name
   * Account is identified by wallet address + chain ID
   */
  async persistWalletAccount(data: {
    accountId: string;
    walletAddress: string;
    chainId: number;
    publicKey: string;
    privateKey: string;
    address: string;
  }): Promise<void> {
    // Generate display name like "Account 1", "Account 2", etc.
    const existingWalletAccounts = await this.listWalletAccounts();
    const displayName = `Account ${existingWalletAccounts.length + 1}`;

    const accountData: CachedAccountData = {
      type: "wallet",
      accountId: data.accountId,
      displayName,
      walletAddress: data.walletAddress,
      chainId: data.chainId,
      publicKey: data.publicKey,
      privateKey: data.privateKey,
      address: data.address,
      createdAt: Date.now(),
    };

    await this.storeAccountData(accountData);
  }

  /**
   * Transactional wallet account setup using ENVELOPE ENCRYPTION
   *
   * CRITICAL INVARIANT: KEKs never encrypt account data.
   * KEKs ONLY encrypt the AMK (privateKey).
   * Account metadata is stored separately.
   *
   * Flow:
   * 1. Initialize wallet KEK session (for wrapped AMK encryption)
   * 2. Store AMK wrapped with wallet KEK
   * 3. Store account metadata (not encrypted with KEK)
   * 4. Finalize full session (derive DEK from AMK)
   */
  async createWalletAccount(
    accountId: string,
    encryptionKey: Uint8Array,
    data: {
      walletAddress: string;
      chainId: number;
      publicKey: string;
      privateKey: string;
      address: string;
    }
  ): Promise<void> {
    let kekCryptoKey: CryptoKey | null = null;

    try {
      // 1️⃣ Import wallet KEK
      const keyBuffer = encryptionKey.buffer.slice(
        encryptionKey.byteOffset,
        encryptionKey.byteOffset + encryptionKey.byteLength
      ) as ArrayBuffer;

      kekCryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, [
        "encrypt",
        "decrypt",
      ]);

      console.debug("[StorageManager][CreateAccount] Wallet KEK imported");

      // 2️⃣ Initialize wrapped AMK KEK session
      await wrappedAMKStorageAdapter.initializeSession(kekCryptoKey);

      console.debug("[StorageManager][CreateAccount] Wrapped AMK KEK initialized");

      // 3️⃣ Store AMK wrapped with wallet KEK (envelope encryption)
      await this.storeWrappedAMK(accountId, "wallet", data.privateKey);

      console.debug("[StorageManager][CreateAccount] Wrapped AMK stored with wallet KEK");

      // 4️⃣ Persist account metadata (NOT encrypted with KEK)
      // Account data is stored WITHOUT encryption by KEK
      // The AMK is already stored securely in wrapped form
      await this.persistWalletAccount({
        accountId,
        walletAddress: data.walletAddress,
        chainId: data.chainId,
        publicKey: data.publicKey,
        privateKey: data.privateKey,
        address: data.address,
      });

      console.debug("[StorageManager][CreateAccount] Account metadata persisted");

      // 5️⃣ Finalize full session (derive DEK from AMK)
      await this.initializeAccountSession(accountId, data.privateKey);

      console.debug("[StorageManager][CreateAccount] Full session initialized (DEK active)");
    } catch (error) {
      this.clearInMemorySession();
      throw error;
    }
  }

  /**
   * Clear session data from memory
   */
  clearInMemorySession(): void {
    sharedEncryptionService.clearEncryptionKey(); // DEK
    wrappedAMKStorageAdapter.clearSession(); // Wrapped AMK KEK
    this.currentAccountName = null;
    this.currentAMK = null; // Clear in-memory AMK
  }

  // ============ WRAPPED AMK OPERATIONS (Envelope Encryption) ============

  /**
   * Store wrapped AMK for a specific auth method
   * Invariant: KEK must be active for the auth method before calling this
   *
   * @param accountId - Wallet account ID
   * @param wrappedBy - Auth method ("wallet" or "passkey")
   * @param amk - Account Master Key (privateKey) to wrap
   */
  async storeWrappedAMK(
    accountId: string,
    wrappedBy: "wallet" | "passkey",
    amk: string
  ): Promise<void> {
    return this.wrappedAMKRepo.storeWrappedAMK(accountId, wrappedBy, amk);
  }

  /**
   * Unwrap (decrypt) AMK using the active KEK
   * Invariant: KEK must be active for the auth method before calling this
   *
   * @param accountId - Wallet account ID
   * @param wrappedBy - Auth method ("wallet" or "passkey")
   * @returns Decrypted AMK (privateKey) or null if not found
   */
  async unwrapAMK(accountId: string, wrappedBy: "wallet" | "passkey"): Promise<string | null> {
    return this.wrappedAMKRepo.unwrapAMK(accountId, wrappedBy);
  }

  /**
   * Check if wrapped AMK exists for a specific auth method
   */
  async hasWrappedAMK(accountId: string, wrappedBy: "wallet" | "passkey"): Promise<boolean> {
    return this.wrappedAMKRepo.hasWrappedAMK(accountId, wrappedBy);
  }

  // ============ NOTES OPERATIONS ============
  // Exact API match to noteCache
  async getCachedNotes(publicKey: string, poolAddress: string): Promise<DiscoveryResult | null> {
    return this.notesRepo.getCachedNotes(publicKey, poolAddress);
  }

  async storeDiscoveredNotes(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[],
    lastProcessedCursor?: string
  ): Promise<void> {
    return this.notesRepo.storeDiscoveredNotes(publicKey, poolAddress, notes, lastProcessedCursor);
  }

  async getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number> {
    return this.notesRepo.getNextDepositIndex(publicKey, poolAddress);
  }

  async updateLastUsedDepositIndex(
    publicKey: string,
    poolAddress: string,
    depositIndex: number
  ): Promise<void> {
    return this.notesRepo.updateLastUsedDepositIndex(publicKey, poolAddress, depositIndex);
  }

  async discoverNotes(
    publicKey: string,
    poolAddress: string,
    accountKey: bigint,
    fetchActivitiesFn: (
      poolAddress: string,
      limit: number,
      cursor?: string,
      orderDirection?: "asc" | "desc"
    ) => Promise<{ items: Activity[]; pageInfo: { hasNextPage: boolean; endCursor?: string } }>,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResult> {
    return this.notesRepo.discoverNotes(
      publicKey,
      poolAddress,
      accountKey,
      fetchActivitiesFn,
      options
    );
  }

  // ============ ACCOUNT OPERATIONS ============
  // Exact API match to noteCache

  async storeAccountData(accountData: CachedAccountData): Promise<void> {
    return this.accountRepo.storeAccountData(accountData);
  }

  /**
   * Get account metadata with AMK-derived fields
   * Uses in-memory AMK from active session if not provided
   *
   * @param amk - Optional Account Master Key (uses session AMK if not provided)
   * @returns Complete account data
   */
  async getAccountData(amk?: string): Promise<CachedAccountData | null> {
    if (!this.currentAccountName) {
      throw new Error("No current account context");
    }
    const useAMK = amk || this.currentAMK;
    if (!useAMK) {
      throw new Error("No AMK available - session not initialized or AMK not provided");
    }
    return this.accountRepo.getAccountMetadata(this.currentAccountName, useAMK);
  }

  /**
   * Get account metadata by name with AMK-derived fields
   *
   * @param accountName - Account ID
   * @param amk - Account Master Key (unwrapped)
   * @returns Complete account data
   */
  async getAccountDataByName(accountName: string, amk: string): Promise<CachedAccountData | null> {
    return this.accountRepo.getAccountMetadata(accountName, amk);
  }

  /**
   * List all accounts (index only - no AMK-derived fields)
   * Returns account metadata without publicKey/address (requires AMK to derive)
   * Use getAccountDataByName(id, amk) to get full account data for a specific account
   */
  async listAllAccounts() {
    // Return account index only (metadata without AMK-derived fields)
    return this.accountRepo.listAccountIndex();
  }

  /**
   * List only wallet accounts
   * Returns account index only (no AMK-derived fields)
   */
  async listWalletAccounts() {
    return this.listAllAccounts();
  }

  async accountExists(accountName: string): Promise<boolean> {
    return this.accountRepo.accountExists(accountName);
  }

  // ============ PASSKEY OPERATIONS ============
  // Exact API match to noteCache

  async storePasskeyData(passkeyData: NamedPasskeyData): Promise<void> {
    return this.passkeyRepo.storePasskeyData(passkeyData);
  }

  async getPasskeyData(accountName: string): Promise<NamedPasskeyData | null> {
    return this.passkeyRepo.getPasskeyData(accountName);
  }

  async passkeyExists(accountName: string): Promise<boolean> {
    return this.passkeyRepo.passkeyExists(accountName);
  }

  // ============ PASSKEY UNLOCK MANAGEMENT (NEW) ============
  // Manage passkey as a property of wallet accounts

  /**
   * Enable passkey unlock for a wallet account
   * Adds passkey metadata to the wallet account
   *
   * @param walletAccountId - Wallet account ID (format: "0xaddress-chainId")
   * @param credentialId - WebAuthn credential ID
   * @param accountData - Current account data (passed from caller, no session dependency)
   * @param deviceName - Optional device name (defaults to "This Device")
   */
  async enablePasskeyUnlock(
    walletAccountId: string,
    credentialId: string,
    accountData: CachedAccountData,
    deviceName: string = "This Device"
  ): Promise<void> {
    if (accountData.type !== "wallet") {
      throw new Error("Only wallet accounts can enable passkey unlock");
    }

    // Verify the wallet account ID matches provided data
    if (accountData.accountId !== walletAccountId) {
      throw new Error(
        `Account ID mismatch: expected ${walletAccountId}, got ${accountData.accountId}`
      );
    }

    // Update account with passkey unlock enabled
    const updatedData: CachedAccountData = {
      ...accountData,
      passkeyUnlock: {
        enabled: true,
        credentialId,
        deviceName,
        createdAt: Date.now(),
      },
    };

    await this.accountRepo.storeAccountData(updatedData);
  }

  /**
   * Remove passkey unlock completely from wallet account
   * Cleans up ALL passkey-related data from IndexedDB
   *
   * Cleanup steps:
   * 1. Delete wrapped AMK (passkey-encrypted)
   * 2. Delete passkey credential metadata
   * 3. Remove passkeyUnlock field from account
   * 4. Remove passkey credential from session (preserves session)
   *
   * @param walletAccountId - Wallet account ID
   */
  async removePasskeyUnlock(walletAccountId: string): Promise<void> {
    console.debug("[StorageManager] Starting complete passkey removal", { walletAccountId });

    // 1️⃣ Get current account data
    const accountData = await this.getAccountData();
    if (!accountData) {
      throw new Error("No active session - please sign in first");
    }

    if (accountData.type !== "wallet") {
      throw new Error("Only wallet accounts can remove passkey unlock");
    }

    if (accountData.accountId !== walletAccountId) {
      throw new Error(
        `Account ID mismatch: expected ${walletAccountId}, got ${accountData.accountId}`
      );
    }

    try {
      // 2️⃣ Delete wrapped AMK from IndexedDB
      await this.wrappedAMKRepo.deleteWrappedAMK(walletAccountId, "passkey");
      console.debug("[StorageManager] Deleted wrapped AMK for passkey");

      // 3️⃣ Delete passkey credential metadata
      await this.passkeyRepo.deletePasskeyData(walletAccountId);
      console.debug("[StorageManager] Deleted passkey credential data");

      // 4️⃣ Remove passkeyUnlock metadata from account
      const updatedData: CachedAccountData = {
        ...accountData,
        passkeyUnlock: undefined,
      };
      await this.accountRepo.storeAccountData(updatedData);
      console.debug("[StorageManager] Removed passkey metadata from account");

      // 5️⃣ Remove passkey credential from session
      // This removes the credentialId but keeps the session active
      const { KDF } = await import("./services/KeyDerivationService");
      await KDF.removePasskeyFromSession();
      console.debug("[StorageManager] Removed passkey credential from session");

      console.debug("[StorageManager] Passkey unlock completely removed");
    } catch (error) {
      console.error("[StorageManager] Failed to remove passkey unlock:", error);
      throw new Error(
        `Failed to remove passkey unlock: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Check if passkey unlock is enabled for a wallet account
   *
   * @param walletAccountId - Wallet account ID (optional - uses current session if not provided)
   * @returns true if passkey unlock is enabled
   */
  async isPasskeyUnlockEnabled(walletAccountId?: string): Promise<boolean> {
    const accountData = await this.getAccountData();
    if (!accountData || accountData.type !== "wallet") {
      return false;
    }

    // If walletAccountId is provided, verify it matches current session
    if (walletAccountId && accountData.accountId !== walletAccountId) {
      return false;
    }

    return accountData.passkeyUnlock?.enabled === true;
  }

  // ============ USER SALT OPERATIONS ============
  // From keyDerivation.ts logic

  async getOrCreateUserSalt(accountName: string): Promise<Uint8Array> {
    return this.sessionRepo.getOrCreateUserSalt(accountName);
  }

  // ============ THEME OPERATIONS ============
  // From ThemeContext.tsx

  async storeTheme(theme: string, storageKey?: string): Promise<void> {
    return this.sessionRepo.storeTheme(theme, storageKey);
  }

  async getTheme(storageKey?: string): Promise<string | null> {
    return this.sessionRepo.getTheme(storageKey);
  }

  // ============ NEW ACCOUNT SYNC BASELINE ============

  /**
   * Initialize sync baseline for new accounts to avoid scanning historical data
   * Sets the current blockchain cursor as the starting point for future syncs
   */
  async initializeSyncBaseline(
    publicKey: string,
    poolAddress: string = SHINOBI_CASH_ETH_POOL.address
  ): Promise<void> {
    try {
      // Get the most recent cursor from the indexer (latest activity)
      const result = await fetchActivities(poolAddress, 1, undefined, "desc");
      const currentCursor = result.pageInfo.endCursor;

      // Store empty notes with current cursor as baseline
      const baselineData = {
        poolAddress,
        publicKey,
        notes: [], // No historical notes for new account
        lastUsedDepositIndex: -1, // Start from deposit index 0
        lastSyncTime: Date.now(),
        lastProcessedCursor: currentCursor, // Start from current blockchain position
      };

      // Store the baseline data
      await this.notesRepo.storeData(
        publicKey,
        poolAddress,
        baselineData.notes,
        baselineData.lastUsedDepositIndex,
        baselineData.lastProcessedCursor
      );
    } catch (error) {
      console.warn("Failed to initialize sync baseline, will fall back to full scan:", error);
      // Don't throw - if this fails, the sync will just do a full scan
    }
  }
  async listAccountIndex() {
    return this.accountRepo.listAccountIndex();
  }
}

// Export singleton instance - maintains same usage pattern as current noteCache
export const storageManager = new StorageManager();
