/**
 * Session Service
 * Manages authentication session lifecycle
 *
 * CRITICAL INVARIANT: tryRestoreSession() must NEVER throw
 * Session persistence is best-effort and should never block bootstrap
 */

import { KDF, storageManager } from "@/lib/storage";
import { parseUserKey, type KeyGenerationResult } from "@shinobi-cash/core";
import type { AuthSession, AuthMethod } from "../domain/types";

/**
 * Create a new authentication session
 *
 * @param accountName - Account identifier
 * @param keys - Generated cryptographic keys
 * @param method - Authentication method used
 * @returns AuthSession with full keys and derived accountKey
 */
export async function createSession(
  accountName: string,
  keys: KeyGenerationResult,
  method: AuthMethod
): Promise<AuthSession> {
  // Derive account key from private key
  const accountKey = parseUserKey(keys.privateKey);

  // Store session info for auto-resume (best-effort, don't throw on failure)
  try {
    await KDF.storeSessionInfo(accountName, method);
  } catch (error) {
    console.warn("Failed to store session info (non-critical):", error);
  }

  return {
    accountName,
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    address: keys.address,
    accountKey,
    authenticatedAt: Date.now(),
  };
}

/**
 * Try to restore session from persistent storage
 *
 * CRITICAL: This function MUST NEVER THROW
 * It should always return AuthSession | null
 *
 * @returns Restored AuthSession or null if restoration fails/not available
 */
export async function tryRestoreSession(): Promise<AuthSession | null> {
  try {
    // Try to resume auth from stored session
    const resume = await KDF.resumeAuth();

    if (resume.status === "none") {
      return null;
    }

    // For passkey auth, we have the derived key result
    if (resume.status === "passkey-ready") {
      const { result, accountName } = resume;

      // Initialize session with derived key
      await storageManager.initializeAccountSession(accountName, result.symmetricKey);

      // Load account data
      const accountData = await storageManager.getAccountData();

      if (!accountData) {
        console.warn("Session resumed but account data not found");
        return null;
      }

      // Derive account key
      const accountKey = parseUserKey(accountData.privateKey);

      return {
        accountName,
        publicKey: accountData.publicKey,
        privateKey: accountData.privateKey,
        address: accountData.address,
        accountKey,
        authenticatedAt: Date.now(),
      };
    }

    return null;
  } catch (error) {
    // CRITICAL: Never throw, just log and return null
    console.warn("Session restoration failed (non-critical):", error);
    return null;
  }
}

/**
 * Clear current session
 * Removes session persistence and clears storage
 *
 * Best-effort: Logs errors but doesn't throw
 */
export async function clearSession(): Promise<void> {
  try {
    // Clear KDF session info
    await KDF.clearSessionInfo();
  } catch (error) {
    console.warn("Failed to clear KDF session (non-critical):", error);
  }

  try {
    // Clear storage manager session
    await storageManager.clearSession();
  } catch (error) {
    console.warn("Failed to clear storage session (non-critical):", error);
  }
}

/**
 * Check if a session can potentially be restored
 * Quick check without actually attempting restoration
 *
 * @returns true if session info exists
 */
export async function hasStoredSession(): Promise<boolean> {
  try {
    const sessionInfo = await KDF.getStoredSessionInfo();
    return sessionInfo !== null;
  } catch (error) {
    // Best-effort check
    return false;
  }
}
