import { keyDerivationService } from "@/services/KeyDerivationService";
import { accountRepo } from "@/lib/storage/repositories/AccountRepository";
import { wrappedAMKRepo } from "@/lib/storage/repositories/WrappedAMKRepository";
import {
  addPasskeyToSession,
  removePasskeyFromSession,
} from "@/lib/storage/repositories/SessionRepository";
import {
  AMKStorageAdapter,
  notesStorageAdapter,
  sharedEncryptionService,
} from "@/lib/storage/adapters/IndexedDBStore";
import { AccountData, AccountMetadata } from "@/lib/storage/interfaces/IDataTypes";
import { createHash } from "@/lib/storage/encryption";
import type { WalletAccountId } from "@shinobi-cash/core/auth";
import { Errors, logError, isUserCancellation } from "@/lib/errors/errors";

export class AccountService {
  private currentAccountName: WalletAccountId | null = null;
  private currentAMK: string | null = null;

  async importWalletKEK(encryptionKey: Uint8Array): Promise<CryptoKey> {
    const keyBytes = new Uint8Array(encryptionKey);
    return await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  }

  // KEKs only encrypt the AMK, not account data directly
  async createWalletAccount(
    accountId: WalletAccountId,
    encryptionKey: Uint8Array,
    privateKey: string
  ): Promise<void> {
    try {
      const kekCryptoKey: CryptoKey = await this.importWalletKEK(encryptionKey);
      await AMKStorageAdapter.initializeSession(kekCryptoKey);
      await wrappedAMKRepo.storeWrappedAMK(accountId, "wallet", privateKey);
      await accountRepo.storeAccountData({ accountId });
      await this.initializeAccountSession(accountId, privateKey);
    } catch (error) {
      this.clearInMemorySession();
      throw error;
    }
  }

  async initializeAccountSession(accountId: WalletAccountId, amkPrivateKey: string): Promise<void> {
    if (!amkPrivateKey || amkPrivateKey.length !== 66) {
      throw new Error("CRITICAL: initializeAccountSession called without valid AMK");
    }

    // Derive DEK first (can throw) - don't set state until all async ops succeed
    const dek = await keyDerivationService.deriveDataEncryptionKey(amkPrivateKey);
    await notesStorageAdapter.initializeSession(dek);

    // All async operations succeeded - now set state
    this.currentAccountName = accountId;
    this.currentAMK = amkPrivateKey;
    sharedEncryptionService.setEncryptionKey(dek);

    if (!sharedEncryptionService.isKeyAvailable()) {
      // Rollback on final validation failure
      this.currentAccountName = null;
      this.currentAMK = null;
      throw new Error("CRITICAL: Session initialization incomplete (DEK missing)");
    }
  }

  async getAccountMetadata(): Promise<AccountMetadata | null> {
    const accountId = this.getCurrentAccountName();
    if (!accountId) {
      throw Errors.auth.sessionRequired();
    }
    const record = await accountRepo.getStoredAccountRecord(accountId);
    return record ? record.profile : null;
  }

  async getAccountData(amk?: string): Promise<AccountData> {
    const accountId = this.getCurrentAccountName();
    if (!accountId) {
      throw Errors.auth.sessionRequired();
    }
    const useAMK = amk || this.getCurrentAMK();
    if (!useAMK) {
      throw Errors.auth.sessionRequired();
    }
    const data = await accountRepo.getAccountMetadata(accountId, useAMK);
    if (!data) {
      throw Errors.auth.accountNotFound();
    }
    return data;
  }

  async isPasskeyUnlockEnabled(): Promise<boolean> {
    try {
      const metadata = await this.getAccountMetadata();
      return !!metadata?.credentialId;
    } catch (error) {
      logError(error, { action: "isPasskeyUnlockEnabled", component: "AccountService" });
      return false;
    }
  }

  public getCurrentAMK() {
    return this.currentAMK;
  }

  public getCurrentAccountName() {
    return this.currentAccountName;
  }

  /**
   * Step 1: Register passkey credential (first biometric prompt)
   * Returns the credentialId to be used in step 2
   */
  async registerPasskeyCredential(): Promise<string> {
    const accountData = await this.getAccountData();

    if (accountData.credentialId) {
      throw Errors.auth.passkeyFailed("Quick Unlock is already enabled");
    }

    const publicKeyHash = await createHash(accountData.publicKey);

    try {
      const { credentialId } = await keyDerivationService.createPasskeyCredential(
        accountData.accountId,
        publicKeyHash
      );
      return credentialId;
    } catch (err) {
      if (isUserCancellation(err)) throw Errors.auth.cancelled(err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("not supported")) throw Errors.auth.passkeyUnsupported(err);
      throw Errors.auth.passkeyFailed("Failed to register biometrics", err);
    }
  }

  /**
   * Step 2: Verify and complete passkey setup (second biometric prompt)
   */
  async completePasskeySetup(credentialId: string): Promise<void> {
    const accountData = await this.getAccountData();

    let passkeyKEK: CryptoKey;
    try {
      passkeyKEK = await keyDerivationService.deriveKEKFromPasskey(
        accountData.accountId,
        credentialId
      );
    } catch (err) {
      if (isUserCancellation(err)) throw Errors.auth.cancelled(err);
      throw Errors.auth.passkeyFailed("Failed to verify biometrics", err);
    }

    const originalMetadata: AccountMetadata = {
      accountId: accountData.accountId,
      credentialId: accountData.credentialId,
    };

    await addPasskeyToSession(credentialId);

    try {
      await AMKStorageAdapter.initializeSession(passkeyKEK);
      await wrappedAMKRepo.storeWrappedAMK(
        accountData.accountId,
        "passkey",
        accountData.privateKey
      );
      const updatedMetadata: AccountMetadata = {
        accountId: accountData.accountId,
        credentialId,
      };
      await accountRepo.storeAccountData(updatedMetadata);
    } catch (error) {
      logError(error, { action: "completePasskeySetup", component: "AccountService" });

      try {
        await removePasskeyFromSession();
        await wrappedAMKRepo.deleteWrappedAMK(accountData.accountId, "passkey");
        await accountRepo.storeAccountData(originalMetadata);
      } catch (rollbackError) {
        logError(rollbackError, {
          action: "completePasskeySetup:rollback",
          component: "AccountService",
        });
      }
      throw Errors.auth.passkeyFailed("Failed to complete Quick Unlock setup", error);
    }
  }

  /**
   * Enable passkey in one call (combines both steps)
   */
  async enablePasskeyForCurrentAccount(): Promise<void> {
    const credentialId = await this.registerPasskeyCredential();
    await this.completePasskeySetup(credentialId);
  }

  async removePasskeyForCurrentAccount(): Promise<void> {
    const accountId = this.getCurrentAccountName();
    if (!accountId) throw Errors.auth.sessionRequired();

    await wrappedAMKRepo.deleteWrappedAMK(accountId, "passkey");
    await accountRepo.storeAccountData({ accountId, credentialId: undefined });
    await removePasskeyFromSession();
  }

  async loginWithWalletKEK(accountId: WalletAccountId, encryptionKey: Uint8Array): Promise<void> {
    const kek = await this.importWalletKEK(encryptionKey);
    await AMKStorageAdapter.initializeSession(kek);

    const amk = await wrappedAMKRepo.unwrapAMK(accountId, "wallet");
    if (!amk) throw Errors.auth.decryptionFailed("Failed to unwrap account key");

    await this.initializeAccountSession(accountId, amk);
  }

  async loginWithPasskeyKEK(accountId: WalletAccountId, kek: CryptoKey): Promise<void> {
    await AMKStorageAdapter.initializeSession(kek);

    const amk = await wrappedAMKRepo.unwrapAMK(accountId, "passkey");

    if (!amk) {
      throw Errors.auth.decryptionFailed("Failed to unwrap account key with passkey");
    }

    await this.initializeAccountSession(accountId, amk);
  }

  clearInMemorySession(): void {
    sharedEncryptionService.clearEncryptionKey();
    AMKStorageAdapter.clearSession();
    this.currentAccountName = null;
    this.currentAMK = null;
  }
}

export const accountService = new AccountService();
