/**
 * Session Management Protocol
 * Pure functions for session restoration and management
 * No side effects except storage operations
 * @file features/auth/protocol/sessionManagement.ts
 */

import { storageManager, KDF } from "@/lib/storage";
import { restoreFromMnemonic, type KeyGenerationResult } from "@shinobi-cash/core";
import type { AuthMethod } from "../types";

// ============ SESSION RESTORATION ============

export type SessionResumeResult =
  | { status: "none" } // No session to resume
  | { status: "passkey-ready"; result: { symmetricKey: CryptoKey }; accountName: string }; // Passkey available

/**
 * Check if a session can be resumed
 * Pure function - checks for existing session data
 *
 * @returns Session resume status
 */
export async function checkSessionResume(): Promise<SessionResumeResult> {
  return await KDF.resumeAuth();
}

/**
 * Resume session with passkey
 * Pure function - uses existing symmetric key to load account data
 *
 * @param symmetricKey - Pre-derived symmetric key from passkey
 * @param accountName - Account name
 * @returns KeyGenerationResult with decrypted keys
 */
export async function resumeWithPasskey(
  symmetricKey: CryptoKey,
  accountName: string
): Promise<KeyGenerationResult> {
  // Initialize session with provided key
  await storageManager.initializeAccountSession(accountName, symmetricKey);

  // Load account data
  const accountData = await storageManager.getAccountData();
  if (!accountData) throw new Error("Account data not found");

  // Restore keys from mnemonic
  const { publicKey, privateKey, address } = restoreFromMnemonic(accountData.mnemonic);

  return {
    publicKey,
    privateKey,
    address,
    mnemonic: accountData.mnemonic,
  } as KeyGenerationResult;
}

// ============ SESSION MANAGEMENT ============

/**
 * Clear current session
 * Pure function - clears all session data
 */
export async function clearSession(): Promise<void> {
  storageManager.clearSession();
  await KDF.clearSessionInfo();
}

/**
 * Store session info for auto-resume
 * Pure function - saves session metadata
 *
 * @param accountName - Account name
 * @param method - Auth method used
 * @param metadata - Optional metadata (e.g., credentialId)
 */
export async function storeSession(
  accountName: string,
  method: AuthMethod,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Both passkey and wallet auth use "passkey" in KDF
  await KDF.storeSessionInfo(accountName, "passkey", metadata);
}

// ============ ACCOUNT MANAGEMENT ============

/**
 * List all account names
 * Pure function - returns list of account names
 *
 * @returns Array of account names
 */
export async function listAccounts(): Promise<string[]> {
  return await storageManager.listAccountNames();
}

/**
 * Check if any accounts exist
 * Pure function - returns boolean
 *
 * @returns true if at least one account exists
 */
export async function hasAccounts(): Promise<boolean> {
  const accounts = await listAccounts();
  return accounts.length > 0;
}

/**
 * Check if an account exists
 * Pure function - returns boolean
 *
 * @param accountId - Account ID to check
 * @returns true if account exists
 */
export async function accountExists(accountId: string): Promise<boolean> {
  return await storageManager.accountExists(accountId);
}
