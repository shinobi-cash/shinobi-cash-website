/**
 * Session Management
 *
 * Handles session restoration and management operations.
 * Coordinates between storage layer and authentication flow.
 */

import { storageManager, KDF } from "@/lib/storage";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import type { AuthMethod } from "../types";
import type { CachedAccountData } from "@/lib/storage/interfaces/IDataTypes";

// ============ SESSION RESTORATION ============

export type SessionResumeResult =
  | { status: "none" }
  | { status: "passkey-ready"; result: { symmetricKey: CryptoKey }; accountName: string };

/**
 * Check if a session can be resumed
 * Checks for existing session data and available auth methods
 */
export async function checkSessionResume(): Promise<SessionResumeResult> {
  return await KDF.resumeAuth();
}

/**
 * Resume session with passkey
 * Uses pre-derived symmetric key to load and decrypt account data
 */
export async function resumeWithPasskey(
  symmetricKey: CryptoKey,
  accountName: string
): Promise<KeyGenerationResult> {
  await storageManager.initializeAccountSession(accountName, symmetricKey);

  const accountData = await storageManager.getAccountData();
  if (!accountData) throw new Error("Account data not found");

  // Return keys (mnemonic not stored, will be empty array)
  return {
    publicKey: accountData.publicKey,
    privateKey: accountData.privateKey,
    address: accountData.address,
    mnemonic: [], // Not stored in database
  };
}

// ============ SESSION MANAGEMENT ============

/**
 * Clear current session
 * Removes all session data and encryption keys
 */
export async function clearSession(): Promise<void> {
  storageManager.clearSession();
  await KDF.clearSessionInfo();
}

/**
 * Store session info for auto-resume
 * Saves session metadata for future restoration
 */
export async function storeSession(
  accountName: string,
  method: AuthMethod,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Map AuthMethod to session storage method
  const sessionMethod = method === "wallet" ? "wallet" : "passkey";
  await KDF.storeSessionInfo(accountName, sessionMethod, metadata);
}

// ============ ACCOUNT MANAGEMENT ============

/**
 * List all account names (legacy - prefer listAllAccounts)
 */
export async function listAccounts(): Promise<string[]> {
  return await storageManager.listAccountNames();
}

/**
 * List all accounts with full data (discriminated by type)
 */
export async function listAllAccounts(): Promise<CachedAccountData[]> {
  return await storageManager.listAllAccounts();
}

/**
 * List only passkey accounts
 */
export async function listPasskeyAccounts(): Promise<CachedAccountData[]> {
  return await storageManager.listPasskeyAccounts();
}

/**
 * List only wallet accounts
 */
export async function listWalletAccounts(): Promise<CachedAccountData[]> {
  return await storageManager.listWalletAccounts();
}

/**
 * Check if any accounts exist
 */
export async function hasAccounts(): Promise<boolean> {
  const accounts = await listAccounts();
  return accounts.length > 0;
}

/**
 * Check if an account exists
 */
export async function accountExists(accountId: string): Promise<boolean> {
  return await storageManager.accountExists(accountId);
}
