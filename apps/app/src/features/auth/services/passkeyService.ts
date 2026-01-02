/**
 * Passkey Service
 * Wrapper around existing passkey authentication implementation
 */

import { performPasskeyLogin, performPasskeySetup } from "../passkey/passkeyAuth";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { createAuthError, AuthErrorCode } from "../domain/types";

/**
 * Login with passkey
 * Authenticates using existing passkey credential
 *
 * @param accountName - User's account name
 * @param preDerivedKEK - Optional pre-derived passkey KEK (from resumeAuth)
 * @returns KeyGenerationResult with full keys
 * @throws AuthError if authentication fails
 */
export async function login(
  accountName: string,
  preDerivedKEK?: CryptoKey
): Promise<KeyGenerationResult> {
  try {
    return await performPasskeyLogin(accountName, preDerivedKEK);
  } catch (error) {
    // Map errors to AuthError
    throw createAuthError(
      AuthErrorCode.PASSKEY_AUTH_FAILED,
      `Passkey authentication failed for account '${accountName}'`,
      error
    );
  }
}

/**
 * Create account with passkey
 * Generates new passkey credential and stores encrypted account data
 *
 * @param accountName - User's chosen account name
 * @param keys - Generated cryptographic keys
 * @throws AuthError if setup fails
 */
export async function createAccount(accountName: string, keys: KeyGenerationResult): Promise<void> {
  try {
    await performPasskeySetup(accountName, keys);
  } catch (error) {
    // Map errors to AuthError
    throw createAuthError(
      AuthErrorCode.PASSKEY_CREATION_FAILED,
      `Failed to create passkey account '${accountName}'`,
      error
    );
  }
}

/**
 * Check if passkey is supported in current environment
 *
 * @returns true if WebAuthn with PRF is available
 */
export function isSupported(): boolean {
  return !!(
    typeof window !== "undefined" &&
    window.PublicKeyCredential &&
    window.navigator?.credentials
  );
}
