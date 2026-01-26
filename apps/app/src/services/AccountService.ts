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
import { EncryptionService, type WalletAccountId } from "@shinobi-cash/core";
import { Errors, logError } from "@/lib/errors/errors";

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

  async enablePasskeyForCurrentAccount(): Promise<void> {
    const accountData = await this.getAccountData();

    if (accountData.credentialId) {
      throw new Error("Passkey already enabled for this account");
    }

    const publicKeyHash = await EncryptionService.createHash(accountData.publicKey);
    const { credentialId } = await keyDerivationService.createPasskeyCredential(
      accountData.accountId,
      publicKeyHash
    );

    const passkeyKEK = await keyDerivationService.deriveKEKFromPasskey(
      accountData.accountId,
      credentialId
    );

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
      logError(error, { action: "enablePasskey", component: "AccountService" });

      try {
        await removePasskeyFromSession();
        await wrappedAMKRepo.deleteWrappedAMK(accountData.accountId, "passkey");
        await accountRepo.storeAccountData(originalMetadata);
      } catch (rollbackError) {
        logError(rollbackError, { action: "enablePasskey:rollback", component: "AccountService" });
      }
      throw error;
    }
  }

  async removePasskeyForCurrentAccount(): Promise<void> {
    const accountData = await this.getAccountMetadata();
    if (!accountData) {
      throw Errors.auth.sessionRequired();
    }

    if (!accountData.credentialId) {
      throw new Error("Passkey unlock is not enabled for this account");
    }

    try {
      await wrappedAMKRepo.deleteWrappedAMK(accountData.accountId, "passkey");
      const updatedMetadata: AccountMetadata = {
        accountId: accountData.accountId,
        credentialId: undefined,
      };
      await accountRepo.storeAccountData(updatedMetadata);
      await removePasskeyFromSession();
    } catch (error) {
      logError(error, { action: "removePasskey", component: "AccountService" });
      throw error;
    }
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
