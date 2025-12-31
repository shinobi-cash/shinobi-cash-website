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
  sharedEncryptionService,
} from "./adapters/IndexedDBAdapter";
import type { CachedAccountData, NamedPasskeyData } from "./interfaces/IDataTypes";
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
    this.accountRepo = new AccountRepository(
      accountStorageAdapter,
      accountStorageAdapter.getEncryptionService()
    );
    this.passkeyRepo = new PasskeyRepository(passkeyStorageAdapter);
    this.sessionRepo = new SessionRepository(localStorageAdapter, sessionStorageAdapter);
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
   /**
   * Session is considered initialized IFF:
   * - KEK is active (accountStorageAdapter)
   * - DEK is active (sharedEncryptionService)
   * - currentAccountName is set
   *
   * No persistent session markers are trusted.
   *
   * @param accountName - Account identifier
   * @param kek - Key Encryption Key from auth method (passkey KEK or wallet KEK)
   * @param amkPrivateKey - Account Master Key (decrypted with KEK)
   */
  async initializeAccountSession(
    accountName: string,
    kek: CryptoKey,
    amkPrivateKey: string
  ): Promise<void> {
    // 1️⃣ Entry + invariant check
    if (!amkPrivateKey || amkPrivateKey.length !== 66) {
      throw new Error("CRITICAL: initializeAccountSession called without valid AMK");
    }

    console.debug("[StorageManager][Session] Finalizing session", { accountName });

    this.currentAccountName = accountName;

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

    // 4️⃣ Activate KEK (account layer)
    await accountStorageAdapter.initializeSession(kek);

    console.debug("[StorageManager][Session] Account encryption initialized (KEK active)", {
      kekReady: accountStorageAdapter.isSessionActive(),
    });

    // 5️⃣ Final invariant check before marking session
    if (!sharedEncryptionService.isKeyAvailable() || !accountStorageAdapter.isSessionActive()) {
      throw new Error("CRITICAL: Session initialization incomplete (KEK or DEK missing)");
    }

    console.debug("[StorageManager][Session] Session fully initialized", {
      accountName,
      kek: "active",
      dek: "active",
    });
  }

  /**
   * Initialize wallet-based account session
   *
   * CRITICAL CHANGE: Now takes both KEK and AMK to follow correct encryption hierarchy.
   *
   * @param accountId - Wallet account identifier
   * @param kek - Wallet KEK (derived from signature)
   * @param amkPrivateKey - Account Master Key (to derive DEK)
   */
  async loginWithWallet(accountId: string, kek: Uint8Array, amkPrivateKey: string): Promise<void> {
    // Convert Uint8Array KEK to CryptoKey
    const keyBuffer = kek.buffer.slice(
      kek.byteOffset,
      kek.byteOffset + kek.byteLength
    ) as ArrayBuffer;

    const kekCryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );

    // Use standard session initialization with KEK and AMK
    await this.initializeAccountSession(accountId, kekCryptoKey, amkPrivateKey);
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
   * Unlock account data ONLY using KEK.
   * ❌ Does NOT derive DEK
   * ❌ Does NOT initialize notes
   */
  async initializeAccountUnlockOnly(accountName: string, kek: CryptoKey): Promise<void> {
    this.currentAccountName = accountName;

    // Account data is encrypted with KEK
    await accountStorageAdapter.initializeSession(kek);
  }

  /**
   * Transactional wallet account setup
   * Ensures both session initialization and data save succeed, or rolls back
   * Prevents partial state (initialized session without account data)
   *
   * CRITICAL CHANGE: Now passes AMK to derive DEK correctly
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
    let sessionInitialized = false;

    try {
      // Step 1: Initialize session with KEK and AMK
      // KEK encrypts account data, AMK derives DEK for notes
      await this.loginWithWallet(accountId, encryptionKey, data.privateKey);
      sessionInitialized = true;

      // Step 2: Save account data (full keys, auto-generated display name)
      await this.persistWalletAccount({
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
        this.clearInMemorySession();
      }
      throw error;
    }
  }

  /**
   * Clear session data from memory
   * Exact implementation from noteCache.clearSession
   */
  clearInMemorySession(): void {
    sharedEncryptionService.clearEncryptionKey(); // DEK
    accountStorageAdapter.clearSession(); // KEK
    this.currentAccountName = null;
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

  /**
   * List all accounts with full data (discriminated by type)
   */
  async listAllAccounts(): Promise<CachedAccountData[]> {
    const index = await this.accountRepo.listAccountIndex();
    const accounts: CachedAccountData[] = [];

    for (const entry of index) {
      const account = await this.getAccountDataByName(entry.id);
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
    return all.filter(
      (acc): acc is CachedAccountData & { type: "passkey" } => acc.type === "passkey"
    );
  }

  /**
   * List only wallet accounts
   */
  async listWalletAccounts(): Promise<CachedAccountData[]> {
    const all = await this.listAllAccounts();
    return all.filter(
      (acc): acc is CachedAccountData & { type: "wallet" } => acc.type === "wallet"
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
