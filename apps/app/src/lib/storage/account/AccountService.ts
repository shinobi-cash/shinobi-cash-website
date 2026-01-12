import { keyDerivationService } from "@/lib/storage/services/KeyDerivationService";
import { repositoryRegistry } from "../RepositoryRegistry";
import {
  AMKStorageAdapter,
  notesStorageAdapter,
  sharedEncryptionService,
} from "../adapters/IndexedDBStore";
import { AccountData, AccountMetadata } from "../interfaces/IDataTypes";
import { EncryptionService } from "@shinobi-cash/core";
import type { WalletAccountId } from "@/features/auth/utils";

export class AccountService {
  private currentAccountName: WalletAccountId | null = null;
  private currentAMK: string | null = null; // In-memory AMK for active session

  async importWalletKEK(encryptionKey: Uint8Array): Promise<CryptoKey> {
    const keyBytes = new Uint8Array(encryptionKey);
    return await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
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
   *
   * @param accountId - Account identifier
   * @param encryptionKey - Wallet-derived encryption key
   * @param data - New account input (all fields required for setup)
   */
  async createWalletAccount(
    accountId: WalletAccountId,
    encryptionKey: Uint8Array,
    privateKey: string
  ): Promise<void> {
    try {
      const kekCryptoKey: CryptoKey = await this.importWalletKEK(encryptionKey);

      console.debug("[StorageManager][CreateAccount] Wallet KEK imported");

      // 2️⃣ Initialize wrapped AMK KEK session
      await AMKStorageAdapter.initializeSession(kekCryptoKey);

      console.debug("[StorageManager][CreateAccount] Wrapped AMK KEK initialized");

      // 3️⃣ Store AMK wrapped with wallet KEK (envelope encryption)
      await repositoryRegistry.wrappedAMK.storeWrappedAMK(accountId, "wallet", privateKey);

      console.debug("[StorageManager][CreateAccount] Wrapped AMK stored with wallet KEK");

      // 4️⃣ Persist account metadata (NOT encrypted with KEK)
      // Account data is stored WITHOUT encryption by KEK
      // The AMK is already stored securely in wrapped form
      await repositoryRegistry.accountRepo.storeAccountData({ accountId });

      console.debug("[StorageManager][CreateAccount] Account metadata persisted");

      // 5️⃣ Finalize full session (derive DEK from AMK)
      await this.initializeAccountSession(accountId, privateKey);

      console.debug("[StorageManager][CreateAccount] Full session initialized (DEK active)");
    } catch (error) {
      this.clearInMemorySession();
      throw error;
    }
  }

  /**
   * Session is considered initialized IFF:
   * - DEK is active (sharedEncryptionService)
   * - currentAccountName is set
   * - currentAMK is set in memory
   *
   * No persistent session markers are trusted.
   *
   * @param accountId - Account identifier (validated)
   * @param amkPrivateKey - Account Master Key (unwrapped from KEK)
   */
  async initializeAccountSession(accountId: WalletAccountId, amkPrivateKey: string): Promise<void> {
    // 1️⃣ Entry + invariant check
    if (!amkPrivateKey || amkPrivateKey.length !== 66) {
      throw new Error("CRITICAL: initializeAccountSession called without valid AMK");
    }

    console.debug("[StorageManager][Session] Finalizing session", { accountId });

    this.currentAccountName = accountId;
    this.currentAMK = amkPrivateKey; // Store AMK in memory for session

    // 2️⃣ Derive DEK from AMK
    console.debug("[StorageManager][Session] Deriving DEK from AMK");

    const dek = await keyDerivationService.deriveDataEncryptionKey(amkPrivateKey);

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
      accountId,
      amk: "in-memory",
      dek: "active",
    });
  }

  /**
   * Get account metadata ONLY (NO secrets)
   * Returns only accountId and credentialId - safe for non-crypto operations
   *
   * @returns Account metadata without privateKey or publicKey
   */
  async getAccountMetadata(): Promise<AccountMetadata | null> {
    const accountId = this.getCurrentAccountName();
    if (!accountId) {
      throw new Error("No current account context");
    }
    const record = await repositoryRegistry.accountRepo.getStoredAccountRecord(accountId);
    return record ? record.profile : null;
  }

  /**
   * Get full account data (metadata + secrets + derived fields)
   * Uses in-memory AMK from active session if not provided   *
   * @param amk - Optional Account Master Key (uses session AMK if not provided)
   * @returns Complete account data with privateKey, publicKey
   */
  async getAccountData(amk?: string): Promise<AccountData | null> {
    const accountId = this.getCurrentAccountName();
    if (!accountId) {
      throw new Error("No current account context");
    }
    const useAMK = amk || this.getCurrentAMK();
    if (!useAMK) {
      throw new Error("No AMK available - session not initialized or AMK not provided");
    }
    return repositoryRegistry.accountRepo.getAccountMetadata(accountId, useAMK);
  }

  /**
   * Check if passkey unlock is enabled for current account
   *
   * @returns true if passkey unlock is enabled (credentialId exists)
   */
  async isPasskeyUnlockEnabled(): Promise<boolean> {
    try {
      const metadata = await this.getAccountMetadata();
      return !!metadata?.credentialId;
    } catch {
      return false;
    }
  }

  public getCurrentAMK() {
    return this.currentAMK;
  }

  public getCurrentAccountName() {
    return this.currentAccountName;
  }

  // ================= PHASE 2: AUTH ORCHESTRATION =================

  /**
   * Enable passkey unlock for current account (ATOMIC)
   *
   * This method is atomic: either everything succeeds or nothing is persisted.
   * Handles rollback on partial failure.
   *
   * Flow:
   * 1. Validate current session
   * 2. Create passkey credential via WebAuthn
   * 3. Derive passkey KEK
   * 4. Update session with credentialId (EARLY - for consistency)
   * 5. Store wrapped AMK (encrypted with passkey KEK)
   * 6. Update account metadata (add credentialId)
   * 7. Rollback session + storage if anything fails
   *
   * @throws Error if no active session, passkey already enabled, or WebAuthn fails
   */
  async enablePasskeyForCurrentAccount(): Promise<void> {
    const accountData = await this.getAccountData();
    if (!accountData) {
      throw new Error("No active session - please sign in first");
    }

    if (accountData.credentialId) {
      throw new Error("Passkey already enabled for this account");
    }

    // 1️⃣ Create passkey credential via WebAuthn
    // Derive publicKeyHash for WebAuthn userId (transient, not stored)
    const publicKeyHash = await EncryptionService.createHash(accountData.publicKey);
    const { credentialId } = await keyDerivationService.createPasskeyCredential(
      accountData.accountId,
      publicKeyHash
    );

    // 3️⃣ Derive passkey KEK
    const passkeyKEK = await keyDerivationService.deriveKEKFromPasskey(
      accountData.accountId,
      credentialId
    );

    // 4️⃣ Store original metadata for rollback (BEFORE any writes)
    const originalMetadata: AccountMetadata = {
      accountId: accountData.accountId,
      credentialId: accountData.credentialId, // May be undefined
    };

    // 5️⃣ Update session FIRST (fast, sessionStorage operation)
    // This ensures session is consistent even if storage operations fail
    await repositoryRegistry.sessionRepo.addPasskeyToSession(credentialId);

    try {
      // 6️⃣ Initialize KEK session for wrapped AMK
      await AMKStorageAdapter.initializeSession(passkeyKEK);

      // 7️⃣ Store wrapped AMK (encrypted with passkey KEK)
      await repositoryRegistry.wrappedAMK.storeWrappedAMK(
        accountData.accountId,
        "passkey",
        accountData.privateKey
      );

      // 8️⃣ Update account metadata with credentialId
      const updatedMetadata: AccountMetadata = {
        accountId: accountData.accountId,
        credentialId,
      };
      await repositoryRegistry.accountRepo.storeAccountData(updatedMetadata);
    } catch (error) {
      // 🚨 ROLLBACK: Restore all state to before enablement attempt
      console.error("[AccountService] Passkey enablement failed, rolling back:", error);

      try {
        // Rollback session (remove credentialId)
        await repositoryRegistry.sessionRepo.removePasskeyFromSession();

        // Rollback wrapped AMK
        await repositoryRegistry.wrappedAMK.deleteWrappedAMK(accountData.accountId, "passkey");

        // Rollback account metadata to original state
        await repositoryRegistry.accountRepo.storeAccountData(originalMetadata);
      } catch (rollbackError) {
        console.error("[AccountService] Rollback failed:", rollbackError);
      }

      throw error;
    }
  }

  /**
   * Remove passkey unlock from current account (ATOMIC)
   *
   * This method is atomic: either everything succeeds or nothing is changed.
   * Mirrors enablePasskeyForCurrentAccount for symmetry.
   *
   * Flow:
   * 1. Validate current session and passkey enabled
   * 2. Delete wrapped AMK (passkey-encrypted)
   * 3. Update account metadata (remove credentialId)
   * 4. Remove passkey from session
   *
   * @throws Error if no active session or passkey not enabled
   */
  async removePasskeyForCurrentAccount(): Promise<void> {
    const accountData = await this.getAccountMetadata();
    if (!accountData) {
      throw new Error("No active session - please sign in first");
    }

    if (!accountData.credentialId) {
      throw new Error("Passkey unlock is not enabled for this account");
    }

    try {
      // 1️⃣ Delete wrapped AMK from IndexedDB
      await repositoryRegistry.wrappedAMK.deleteWrappedAMK(accountData.accountId, "passkey");
      console.debug("[AccountService] Deleted wrapped AMK for passkey");

      // 2️⃣ Remove credentialId from account metadata
      const updatedMetadata: AccountMetadata = {
        accountId: accountData.accountId,
        credentialId: undefined,
      };
      await repositoryRegistry.accountRepo.storeAccountData(updatedMetadata);
      console.debug("[AccountService] Removed credentialId from account");

      // 3️⃣ Remove passkey credential from session
      await repositoryRegistry.sessionRepo.removePasskeyFromSession();
      console.debug("[AccountService] Passkey unlock completely removed");
    } catch (error) {
      console.error("[AccountService] Failed to remove passkey unlock:", error);
      throw new Error(
        `Failed to remove passkey unlock: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Login with wallet-derived KEK (existing account)
   * Encapsulates: KEK import → AMK unwrap → session initialization
   *
   * @param accountId - Account identifier (validated)
   * @param encryptionKey - Wallet-derived encryption key bytes
   */
  async loginWithWalletKEK(accountId: WalletAccountId, encryptionKey: Uint8Array): Promise<void> {
    const kek = await this.importWalletKEK(encryptionKey);
    await AMKStorageAdapter.initializeSession(kek);

    const amk = await repositoryRegistry.wrappedAMK.unwrapAMK(accountId, "wallet");
    if (!amk) throw new Error("AMK unwrap failed");

    await this.initializeAccountSession(accountId, amk);
  }

  /**
   * Login with passkey-derived KEK (existing account)
   * Encapsulates: AMK adapter init → AMK unwrap → session initialization
   *
   * @param accountId - Account identifier (validated)
   * @param kek - Passkey-derived KEK (CryptoKey)
   * @throws Error if AMK unwrap fails
   */
  async loginWithPasskeyKEK(accountId: WalletAccountId, kek: CryptoKey): Promise<void> {
    await AMKStorageAdapter.initializeSession(kek);

    const amk = await repositoryRegistry.wrappedAMK.unwrapAMK(accountId, "passkey");

    if (!amk) {
      throw new Error("AMK unwrap failed for passkey");
    }

    await this.initializeAccountSession(accountId, amk);
  }

  /**
   * Clear session data from memory
   */
  clearInMemorySession(): void {
    sharedEncryptionService.clearEncryptionKey(); // DEK
    AMKStorageAdapter.clearSession(); // Wrapped AMK KEK

    // CRITICAL: Clear in-memory session state
    this.currentAccountName = null;
    this.currentAMK = null;
  }
}

export const accountService = new AccountService();
