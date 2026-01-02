/**
 * Passkey Authentication
 * file: src/features/auth/passkey/passkeyAuth.ts
 * Handles WebAuthn passkey operations for authentication.
 * Uses PRF extension for deterministic key derivation.
 */

import { storageManager, KDF } from "@/lib/storage";
import { AuthError, AuthErrorCode, mapPasskeyError } from "@/lib/errors/AuthError";
import { EncryptionService, type KeyGenerationResult } from "@shinobi-cash/core";

// ============ PASSKEY LOGIN ============

/**
 * Perform passkey-based login for existing account
 * Returns keys or throws typed error
 *
 * @param accountName - Account identifier
 * @param preDerivedKEK - Optional pre-derived passkey KEK (skips WebAuthn call if provided)
 */
export async function performPasskeyLogin(
  accountName: string,
  preDerivedKEK?: CryptoKey
): Promise<KeyGenerationResult> {
  const trimmed = accountName.trim();

  // Check if passkey exists
  const passkeyData = await storageManager.getPasskeyData(trimmed);
  if (!passkeyData) {
    throw new AuthError(
      AuthErrorCode.PASSKEY_NOT_FOUND,
      `No passkey found for account '${trimmed}'. Please create one first.`
    );
  }

  // Derive symmetric key from passkey (this is the KEK)
  // Skip if pre-derived KEK is provided (from resumeAuth)
  let passkeyKEK: CryptoKey;
  if (preDerivedKEK) {
    console.debug("[PasskeyLogin] Using pre-derived KEK (skipping duplicate WebAuthn call)");
    passkeyKEK = preDerivedKEK;
  } else {
    console.debug("[PasskeyLogin] Deriving KEK from passkey");
    try {
      ({ symmetricKey: passkeyKEK } = await KDF.deriveKeyFromPasskey(
        trimmed,
        passkeyData.credentialId
      ));
    } catch (err) {
      throw mapPasskeyError(err);
    }
  }

  // ENVELOPE ENCRYPTION: Unwrap AMK using passkey KEK
  // 1️⃣ Init KEK only for wrapped-AMK store
  const { wrappedAMKStorageAdapter } = await import("@/lib/storage/adapters/IndexedDBAdapter");
  await wrappedAMKStorageAdapter.initializeSession(passkeyKEK);

  // 2️⃣ Unwrap AMK with passkey KEK
  const amk = await storageManager.unwrapAMK(trimmed, "passkey");
  if (!amk) {
    throw new AuthError(
      AuthErrorCode.DECRYPTION_FAILED,
      "Failed to unwrap AMK with passkey KEK. Passkey data may be corrupted."
    );
  }

  // 3️⃣ Finalize session (activates DEK + sets account context)
  await storageManager.initializeAccountSession(trimmed, amk);

  // Load account metadata using unwrapped AMK
  const accountData = await storageManager.getAccountData(amk);
  if (!accountData) {
    throw new AuthError(AuthErrorCode.DECRYPTION_FAILED, "Failed to load account metadata");
  }

  // Return keys
  return {
    publicKey: accountData.publicKey,
    privateKey: amk,
    address: accountData.address,
  };
}

// ============ PASSKEY SETUP ============

/**
 * Setup passkey unlock for existing wallet account
 * Adds passkey as a convenience unlock method (NOT a separate account)
 *
 * IMPORTANT: This is now post-auth only - user must be logged in with wallet first
 *
 * @param walletAccountId - Wallet account ID (format: "0xaddress-chainId")
 * @param generatedKeys - Existing wallet keys (NOT new keys)
 */
export async function performPasskeySetup(
  walletAccountId: string,
  generatedKeys: KeyGenerationResult
): Promise<void> {
  // Get AMK from provided keys (user is already authenticated)
  const amk = generatedKeys.privateKey;

  // Check if wallet account exists and load metadata
  const walletAccount = await storageManager.getAccountDataByName(walletAccountId, amk);
  if (!walletAccount || walletAccount.type !== "wallet") {
    throw new AuthError(
      AuthErrorCode.ACCOUNT_NOT_FOUND,
      `Wallet account not found: ${walletAccountId}`
    );
  }

  // Check if passkey unlock already enabled
  const isEnabled = await storageManager.isPasskeyUnlockEnabled(walletAccountId);
  if (isEnabled) {
    throw new AuthError(
      AuthErrorCode.ACCOUNT_ALREADY_EXISTS,
      "Passkey unlock already enabled for this wallet"
    );
  }

  // Generate user handle (hash of public key)
  const userHandle = await EncryptionService.createHash(generatedKeys.publicKey);

  // Create passkey credential using walletAccountId as passkey name
  let credentialId: string;
  try {
    ({ credentialId } = await KDF.createPasskeyCredential(walletAccountId, userHandle));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  // Derive symmetric key from new passkey (this is the KEK)
  let passkeyKEK: CryptoKey;
  try {
    ({ symmetricKey: passkeyKEK } = await KDF.deriveKeyFromPasskey(walletAccountId, credentialId));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  try {
    // ENVELOPE ENCRYPTION: Store AMK wrapped with passkey KEK
    // This allows the same AMK to be unwrapped with either wallet KEK OR passkey KEK
    // WITHOUT overwriting the wallet-encrypted version

    // Get AMK from wallet account (already decrypted in current session)
    const amk = walletAccount.privateKey;

    // Initialize passkey KEK for wrapped AMK storage
    const { wrappedAMKStorageAdapter } = await import("@/lib/storage/adapters/IndexedDBAdapter");
    await wrappedAMKStorageAdapter.initializeSession(passkeyKEK);

    // Store AMK wrapped with passkey KEK (does NOT overwrite wallet-wrapped AMK)
    await storageManager.storeWrappedAMK(walletAccountId, "passkey", amk);

    console.debug("[PasskeySetup] Wrapped AMK stored with passkey KEK");

    // Enable passkey unlock metadata on the wallet account
    await storageManager.enablePasskeyUnlock(walletAccountId, credentialId, walletAccount);

    // ARM SILENT RESUME - add passkey to existing session (don't replace authMethod)
    // This allows passkey unlock while preserving the original wallet auth
    await KDF.addPasskeyToSession(credentialId);
    console.debug("[PasskeySetup] Added passkey credential to existing session");

    // Store passkey credential metadata
    await storageManager.storePasskeyData({
      accountName: walletAccountId,
      credentialId,
      publicKeyHash: userHandle,
      created: Date.now(),
    });

    console.debug("[PasskeySetup] Passkey unlock enabled successfully");
  } catch (e) {
    storageManager.clearInMemorySession();
    throw e;
  }
}

// ============ PASSKEY CHECK ============

/**
 * Check if an account has a passkey
 */
export async function hasPasskey(accountName: string): Promise<boolean> {
  return await storageManager.passkeyExists(accountName.trim());
}
