/**
 * file: shinobi-cash-website/apps/app/src/lib/storage/StorageManager.ts
 * Storage Manager - Main coordinator for all storage operations
 * Maintains exact same API as current noteCache for seamless replacement
 */

import { fetchActivities } from "@/services/data/indexerService";
import { localStorageAdapter, sessionStorageAdapter } from "./adapters/BrowserStorageAdapter";
import {
  accountStorageAdapter,
  notesStorageAdapter,
  passkeyStorageAdapter,
  sharedEncryptionService,
} from "./adapters/IndexedDBAdapter";
import type {
  CachedAccountData,
  DiscoveryResult,
  NamedPasskeyData,
  NoteChain,
} from "./interfaces/IDataTypes";
import { AccountRepository } from "./repositories/AccountRepository";
import { NotesRepository } from "./repositories/NotesRepository";
import { PasskeyRepository } from "./repositories/PasskeyRepository";
import { SessionRepository } from "./repositories/SessionRepository";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

class StorageManager {
  private notesRepo: NotesRepository;
  private accountRepo: AccountRepository;
  private passkeyRepo: PasskeyRepository;
  private sessionRepo: SessionRepository;
  private currentAccountName: string | null = null;

  constructor() {
    this.notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
    this.accountRepo = new AccountRepository(accountStorageAdapter, sharedEncryptionService);
    this.passkeyRepo = new PasskeyRepository(passkeyStorageAdapter);
    this.sessionRepo = new SessionRepository(localStorageAdapter, sessionStorageAdapter);
  }

  // ============ SESSION MANAGEMENT ============
  // Exact API match to noteCache

  /**
   * Initialize account-scoped session with derived encryption key
   * Exact implementation from noteCache.initializeAccountSession
   */
  async initializeAccountSession(accountName: string, symmetricKey: CryptoKey): Promise<void> {
    this.currentAccountName = accountName;
    sharedEncryptionService.setEncryptionKey(symmetricKey);

    // Initialize all storage adapters
    await notesStorageAdapter.initializeSession(symmetricKey);
    await accountStorageAdapter.initializeSession(symmetricKey);

    // Mark session as initialized
    await this.sessionRepo.markSessionInitialized(accountName);
  }

  /**
   * Initialize wallet-based account session with signature-derived encryption key
   * Used when user skips passkey setup and relies on wallet signature for encryption
   */
  async initializeWalletAccountSession(
    accountId: string,
    encryptionKey: Uint8Array
  ): Promise<void> {
    // Convert Uint8Array to CryptoKey for encryption
    // Ensure the buffer is an ArrayBuffer for crypto.subtle
    const keyBuffer = encryptionKey.buffer.slice(
      encryptionKey.byteOffset,
      encryptionKey.byteOffset + encryptionKey.byteLength
    ) as ArrayBuffer;

    const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);

    // Use standard session initialization
    await this.initializeAccountSession(accountId, cryptoKey);
  }

  /**
   * Save wallet-based account data with auto-generated display name
   * Account is identified by wallet address + chain ID
   */
  async saveWalletAccountData(data: {
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
   * Transactional wallet account setup
   * Ensures both session initialization and data save succeed, or rolls back
   * Prevents partial state (initialized session without account data)
   */
  async setupWalletAccountTransaction(
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
    let sessionInitialized = false;

    try {
      // Step 1: Initialize session
      await this.initializeWalletAccountSession(accountId, encryptionKey);
      sessionInitialized = true;

      // Step 2: Save account data (full keys, auto-generated display name)
      await this.saveWalletAccountData({
        accountId,
        walletAddress: data.walletAddress,
        chainId: data.chainId,
        publicKey: data.publicKey,
        privateKey: data.privateKey,
        address: data.address,
      });
    } catch (error) {
      // Rollback: Clear session if it was initialized
      if (sessionInitialized) {
        this.clearSession();
      }
      throw error;
    }
  }

  /**
   * Clear session data from memory
   * Exact implementation from noteCache.clearSession
   */
  clearSession(): void {
    sharedEncryptionService.clearEncryptionKey();
    this.currentAccountName = null;
  }

  /**
   * Check if there's any encrypted data in storage
   * Exact implementation from noteCache.hasEncryptedData
   */
  hasEncryptedData(accountName?: string): boolean {
    return this.sessionRepo.hasEncryptedData(accountName);
  }

  /**
   * Clear all cached data (for logout/session end)
   * Exact implementation from noteCache.clearAllData
   */
  async clearAllData(): Promise<void> {
    await notesStorageAdapter.clearAllStores();
    this.clearSession();
    await this.sessionRepo.clearAllSessionMarkers();
  }

  /**
   * Reset the database by deleting and recreating it
   * Exact implementation from noteCache.resetDatabase
   */
  async resetDatabase(): Promise<void> {
    await notesStorageAdapter.resetDatabase();
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

  // ============ ACCOUNT OPERATIONS ============
  // Exact API match to noteCache

  async storeAccountData(accountData: CachedAccountData): Promise<void> {
    return this.accountRepo.storeAccountData(accountData);
  }

  async getAccountData(): Promise<CachedAccountData | null> {
    if (!this.currentAccountName) {
      throw new Error("No current account context");
    }
    return this.accountRepo.getDecryptedAccountData(this.currentAccountName);
  }

  async getAccountDataByName(accountName: string): Promise<CachedAccountData | null> {
    // Return decrypted data for callers expecting CachedAccountData
    return this.accountRepo.getDecryptedAccountData(accountName);
  }

  async listAccountNames(): Promise<string[]> {
    return this.accountRepo.listAccountNames();
  }

  /**
   * List all accounts with full data (discriminated by type)
   */
  async listAllAccounts(): Promise<CachedAccountData[]> {
    const names = await this.accountRepo.listAccountNames();
    const accounts: CachedAccountData[] = [];

    for (const name of names) {
      const account = await this.getAccountDataByName(name);
      if (account) {
        accounts.push(account);
      }
    }

    return accounts;
  }

  /**
   * List only passkey accounts
   */
  async listPasskeyAccounts(): Promise<CachedAccountData[]> {
    const all = await this.listAllAccounts();
    return all.filter((acc): acc is CachedAccountData & { type: "passkey" } =>
      acc.type === "passkey"
    );
  }

  /**
   * List only wallet accounts
   */
  async listWalletAccounts(): Promise<CachedAccountData[]> {
    const all = await this.listAllAccounts();
    return all.filter((acc): acc is CachedAccountData & { type: "wallet" } =>
      acc.type === "wallet"
    );
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

      console.log(`Initialized sync baseline for new account with cursor: ${currentCursor}`);
    } catch (error) {
      console.warn("Failed to initialize sync baseline, will fall back to full scan:", error);
      // Don't throw - if this fails, the sync will just do a full scan
    }
  }
}

// Export singleton instance - maintains same usage pattern as current noteCache
export const storageManager = new StorageManager();

// Export individual repositories for direct access if needed
export { NotesRepository } from "./repositories/NotesRepository";
export { AccountRepository } from "./repositories/AccountRepository";
export { PasskeyRepository } from "./repositories/PasskeyRepository";
export { SessionRepository } from "./repositories/SessionRepository";
