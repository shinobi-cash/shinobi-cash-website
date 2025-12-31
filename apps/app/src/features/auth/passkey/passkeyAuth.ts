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
 */
export async function performPasskeyLogin(accountName: string): Promise<KeyGenerationResult> {
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
  let passkeyKEK: CryptoKey;
  try {
    ({ symmetricKey: passkeyKEK } = await KDF.deriveKeyFromPasskey(
      trimmed,
      passkeyData.credentialId
    ));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  // Existing passkey account MUST either fully restore or fail loudly.
  // No fallback to account creation is allowed here.
  // Step 1: Unlock account data only (KEK)
  await storageManager.initializeAccountUnlockOnly(trimmed, passkeyKEK);

  // Step 2: Load decrypted account data (contains AMK)
  const accountData = await storageManager.getAccountData();
  if (!accountData) {
    throw new AuthError(
      AuthErrorCode.DECRYPTION_FAILED,
      "Failed to decrypt account data with passkey"
    );
  }

  // Step 3: Finalize session with AMK → DEK
  await storageManager.initializeAccountSession(trimmed, passkeyKEK, accountData.privateKey);

  // Return keys
  return {
    publicKey: accountData.publicKey,
    privateKey: accountData.privateKey,
    address: accountData.address,
  };
}

// ============ PASSKEY SETUP ============

/**
 * Setup passkey for new account
 * Creates passkey and stores encrypted data
 */
export async function performPasskeySetup(
  accountName: string,
  generatedKeys: KeyGenerationResult
): Promise<void> {
  const trimmed = accountName.trim();

  // Check if passkey already exists
  const hasPasskey = await storageManager.passkeyExists(trimmed);
  if (hasPasskey) {
    throw new AuthError(
      AuthErrorCode.ACCOUNT_ALREADY_EXISTS,
      "Passkey already exists for this account"
    );
  }

  // Generate user handle (hash of public key)
  const userHandle = await EncryptionService.createHash(generatedKeys.publicKey);

  // Create passkey credential
  let credentialId: string;
  try {
    ({ credentialId } = await KDF.createPasskeyCredential(trimmed, userHandle));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  // Derive symmetric key from new passkey (this is the KEK)
  let passkeyKEK: CryptoKey;
  try {
    ({ symmetricKey: passkeyKEK } = await KDF.deriveKeyFromPasskey(trimmed, credentialId));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  try {
    // Initialize session with passkey KEK and AMK
    // KEK encrypts account data, AMK derives DEK for notes
    await storageManager.initializeAccountSession(trimmed, passkeyKEK, generatedKeys.privateKey);

    // Store encrypted account data (privateKey only, no mnemonic)
    await storageManager.storeAccountData({
      type: "passkey",
      accountName: trimmed,
      displayName: trimmed, // For passkeys, display name = account name
      publicKey: generatedKeys.publicKey,
      privateKey: generatedKeys.privateKey,
      address: generatedKeys.address,
      createdAt: Date.now(),
    });

    // Store passkey metadata
    await storageManager.storePasskeyData({
      accountName: trimmed,
      credentialId,
      publicKeyHash: userHandle,
      created: Date.now(),
    });
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
