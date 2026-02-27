import { keyDerivationService } from "@/services/KeyDerivationService";
import { accountRepo } from "@/lib/storage/repositories/AccountRepository";
import { masterKeyRepo } from "@/lib/storage/repositories/MasterKeyRepository";
import {
  addPasskeyToSession,
  removePasskeyFromSession,
} from "@/lib/storage/repositories/SessionRepository";
import {
  masterKeyStore,
  notesStorageAdapter,
  sharedEncryptionService,
} from "@/lib/storage/adapters/IndexedDBStore";
import { AccountData, AccountMetadata } from "@/lib/storage/interfaces/IDataTypes";
import { createHash } from "@/lib/storage/encryption";
import type { WalletAccountId } from "@/lib/auth";
import { Errors, logError, isUserCancellation } from "@/lib/errors/errors";

export class AccountService {
  private currentAccountName: WalletAccountId | null = null;
  private masterKey: string | null = null;

  // KEKs only encrypt the Master Key, not account data directly
  async createWalletAccount(
    accountId: WalletAccountId,
    kek: CryptoKey,
    privateKey: string
  ): Promise<void> {
    await masterKeyStore.initializeSession(kek);
    await masterKeyRepo.storeWrappedKey(accountId, "wallet", privateKey);
    await accountRepo.storeAccountData({ accountId });

    try {
      await this.initializeAccountSession(accountId, privateKey);
    } catch (error) {
      // Rollback IndexedDB writes + in-memory state
      this.clearInMemorySession();
      try {
        await masterKeyRepo.deleteWrappedKey(accountId, "wallet");
      } catch {
        // Best-effort cleanup
      }
      throw error;
    }
  }

  async initializeAccountSession(accountId: WalletAccountId, masterKey: string): Promise<void> {
    if (!masterKey || masterKey.length !== 66) {
      throw Errors.auth.failed("initializeAccountSession called without valid Master Key");
    }

    // Derive DEK first (can throw) - don't set state until all async ops succeed
    let dek: CryptoKey;
    try {
      dek = await keyDerivationService.deriveDataEncryptionKey(masterKey);
    } catch (error) {
      throw Errors.auth.failed("Failed to derive data encryption key", error);
    }

    try {
      await notesStorageAdapter.initializeSession(dek);
    } catch (error) {
      throw Errors.auth.failed("Failed to initialize encrypted storage", error);
    }

    // All async operations succeeded - now set state
    this.currentAccountName = accountId;
    this.masterKey = masterKey;
    sharedEncryptionService.setEncryptionKey(dek);

    if (!sharedEncryptionService.isKeyAvailable()) {
      // Rollback on final validation failure
      this.currentAccountName = null;
      this.masterKey = null;
      throw Errors.auth.failed("Session initialization incomplete (DEK missing)");
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

  async getAccountData(mk?: string): Promise<AccountData> {
    const accountId = this.getCurrentAccountName();
    if (!accountId) {
      throw Errors.auth.sessionRequired();
    }
    const useMK = mk || this.getMasterKey();
    if (!useMK) {
      throw Errors.auth.sessionRequired();
    }
    const data = await accountRepo.getAccountMetadata(accountId, useMK);
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

  public getMasterKey() {
    return this.masterKey;
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
      await masterKeyStore.initializeSession(passkeyKEK);
      await masterKeyRepo.storeWrappedKey(
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
        await masterKeyRepo.deleteWrappedKey(accountData.accountId, "passkey");
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

    // Clear metadata first — if deleteWrappedKey fails, we have an orphaned
    // encrypted blob (harmless) rather than a stale credentialId (broken login)
    await accountRepo.storeAccountData({ accountId, credentialId: undefined });
    await removePasskeyFromSession();
    await masterKeyRepo.deleteWrappedKey(accountId, "passkey");
  }

  async loginWithWalletKEK(accountId: WalletAccountId, kek: CryptoKey): Promise<void> {
    await masterKeyStore.initializeSession(kek);

    const mk = await masterKeyRepo.unwrapKey(accountId, "wallet");
    if (!mk) throw Errors.auth.decryptionFailed("Failed to unwrap Master Key");

    await this.initializeAccountSession(accountId, mk);
  }

  async loginWithPasskeyKEK(accountId: WalletAccountId, kek: CryptoKey): Promise<void> {
    await masterKeyStore.initializeSession(kek);

    const mk = await masterKeyRepo.unwrapKey(accountId, "passkey");

    if (!mk) {
      throw Errors.auth.decryptionFailed("Failed to unwrap Master Key with passkey");
    }

    await this.initializeAccountSession(accountId, mk);
  }

  clearInMemorySession(): void {
    sharedEncryptionService.clearEncryptionKey();
    masterKeyStore.clearSession();
    this.currentAccountName = null;
    this.masterKey = null;
  }
}

export const accountService = new AccountService();
