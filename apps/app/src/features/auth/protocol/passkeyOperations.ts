/**
 * Passkey Operations Protocol
 * Pure functions for WebAuthn passkey operations
 * No side effects except crypto operations
 * @file features/auth/protocol/passkeyOperations.ts
 */

import { storageManager, KDF } from "@/lib/storage";
import { AuthError, AuthErrorCode, mapPasskeyError } from "@/lib/errors/AuthError";
import { createHash } from "@/utils/crypto";
import { restoreFromMnemonic, type KeyGenerationResult } from "@shinobi-cash/core";

// ============ PASSKEY LOGIN ============

/**
 * Perform passkey-based login for existing account
 * Pure function - returns keys or throws typed error
 *
 * @param accountName - Account name to login to
 * @returns KeyGenerationResult with decrypted keys
 * @throws AuthError with specific error code
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

  // Derive symmetric key from passkey
  let symmetricKey: CryptoKey;
  try {
    ({ symmetricKey } = await KDF.deriveKeyFromPasskey(trimmed, passkeyData.credentialId));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  // Initialize session with derived key
  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  // Load and decrypt account data
  const accountData = await storageManager.getAccountData();
  if (!accountData) {
    throw new AuthError(AuthErrorCode.ACCOUNT_NOT_FOUND, "Account data not found");
  }

  // Restore keys from mnemonic
  const { publicKey, privateKey, address } = restoreFromMnemonic(accountData.mnemonic);

  // Store session info for auto-resume
  await KDF.storeSessionInfo(trimmed, "passkey", { credentialId: passkeyData.credentialId });

  return {
    publicKey,
    privateKey,
    address,
    mnemonic: accountData.mnemonic,
  } as KeyGenerationResult;
}

// ============ PASSKEY SETUP ============

/**
 * Setup passkey for new account
 * Pure function - creates passkey and stores encrypted data
 *
 * @param accountName - Account name for the new passkey
 * @param generatedKeys - Keys to encrypt and store
 * @throws AuthError with specific error code
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
  const userHandle = await createHash(generatedKeys.publicKey);

  // Create passkey credential
  let credentialId: string;
  try {
    ({ credentialId } = await KDF.createPasskeyCredential(trimmed, userHandle));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  // Derive symmetric key from new passkey
  let symmetricKey: CryptoKey;
  try {
    ({ symmetricKey } = await KDF.deriveKeyFromPasskey(trimmed, credentialId));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  // Initialize session with passkey-derived key
  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  // Store encrypted account data
  await storageManager.storeAccountData({
    accountName: trimmed,
    mnemonic: generatedKeys.mnemonic,
    publicKey: generatedKeys.publicKey,
    createdAt: Date.now(),
  });

  // Store passkey metadata
  await storageManager.storePasskeyData({
    accountName: trimmed,
    credentialId,
    publicKeyHash: userHandle,
    created: Date.now(),
  });

  // Store session info for auto-resume
  await KDF.storeSessionInfo(trimmed, "passkey", { credentialId });
}

// ============ PASSKEY CHECK ============

/**
 * Check if an account has a passkey
 * Pure function - returns boolean
 *
 * @param accountName - Account name to check
 * @returns true if passkey exists
 */
export async function hasPasskey(accountName: string): Promise<boolean> {
  return await storageManager.passkeyExists(accountName.trim());
}
