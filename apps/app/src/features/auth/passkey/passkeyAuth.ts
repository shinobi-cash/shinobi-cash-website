/**
 * Passkey Authentication
 * file: src/features/auth/passkey/passkeyAuth.ts
 * Handles WebAuthn passkey operations for authentication.
 * Uses PRF extension for deterministic key derivation.
 */

import { storageManager, KDF } from "@/lib/storage";
import { AuthError, AuthErrorCode, mapPasskeyError } from "@/lib/errors/AuthError";
import { createHash } from "../shared/crypto-utils";
import type { KeyGenerationResult } from "@shinobi-cash/core";

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

  // Derive symmetric key from passkey
  let symmetricKey: CryptoKey;
  try {
    ({ symmetricKey } = await KDF.deriveKeyFromPasskey(trimmed, passkeyData.credentialId));
  } catch (err) {
    throw mapPasskeyError(err);
  }

  // Initialize session with derived key
  await storageManager.initializeAccountSession(trimmed, symmetricKey);

  // Load and decrypt account data (already contains full keys)
  const accountData = await storageManager.getAccountData();
  if (!accountData) {
    throw new AuthError(AuthErrorCode.ACCOUNT_NOT_FOUND, "Account data not found");
  }

  // Store session info for auto-resume
  await KDF.storeSessionInfo(trimmed, "passkey", { credentialId: passkeyData.credentialId });

  // Return keys (mnemonic not stored, will be empty array)
  return {
    publicKey: accountData.publicKey,
    privateKey: accountData.privateKey,
    address: accountData.address,
    mnemonic: [], // Not stored in database
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

  // Store session info for auto-resume
  await KDF.storeSessionInfo(trimmed, "passkey", { credentialId });
}

// ============ PASSKEY CHECK ============

/**
 * Check if an account has a passkey
 */
export async function hasPasskey(accountName: string): Promise<boolean> {
  return await storageManager.passkeyExists(accountName.trim());
}
