/**
 * Auth Service
 * Main authentication orchestration layer
 *
 * RESPONSIBILITY:
 * - Route auth to passkey or wallet flows
 * - Do NOT manage crypto sessions directly
 * - Do NOT persist keys
 *
 * Crypto session lifecycle is owned by:
 * - walletAuth / passkeyAuth
 * - StorageManager
 * - KDF (resume metadata only)
 */

import type { KeyGenerationResult } from "@shinobi-cash/core";
import type { AuthMethod } from "../domain/types";
import * as passkeyService from "./passkeyService";
import * as walletService from "./walletService";
import { KDF, storageManager } from "@/lib/storage";

/**
 * Authenticate with existing account
 * Routes to appropriate auth method
 *
 * @param accountId - Account identifier
 * @param method - Authentication method (passkey or wallet)
 * @param walletParams - Required for wallet auth
 * @returns KeyGenerationResult
 */
export async function authenticate(
  accountId: string,
  method: AuthMethod,
  walletParams?: {
    signature: string;
    walletAddress: string;
    chainId: number;
  }
): Promise<KeyGenerationResult> {
  if (method === "passkey") {
    return passkeyService.login(accountId);
  }

  if (!walletParams) {
    throw new Error("Wallet parameters required for wallet authentication");
  }

  const { signature, walletAddress, chainId } = walletParams;
  return walletService.login(signature, walletAddress, chainId);
}

/**
 * Create new account
 * Routes to appropriate account creation method
 *
 * @param accountId - Account identifier
 * @param method - Authentication method
 * @param keys - Generated cryptographic keys
 * @param walletParams - Required for wallet account creation
 * @returns KeyGenerationResult
 */
export async function createAccount(
  accountId: string,
  method: AuthMethod,
  keys: KeyGenerationResult,
  walletParams?: {
    signature: string;
    walletAddress: string;
    chainId: number;
  }
): Promise<KeyGenerationResult> {
  if (method === "passkey") {
    await passkeyService.createAccount(accountId, keys);
    return keys;
  }

  if (!walletParams) {
    throw new Error("Wallet parameters required for wallet account creation");
  }

  const { signature, walletAddress, chainId } = walletParams;
  await walletService.createAccount(walletAddress, signature, chainId, keys);

  return keys;
}

/**
 * Bootstrap authentication system
 *
 * Attempts best-effort session resume.
 * NEVER throws.
 *
 * NOTE:
 * - "session-restored" means crypto session (KEK + DEK) is live
 * - No keys are returned or stored here
 */
export async function bootstrap(): Promise<
  | { type: "session-restored" }
  | { type: "no-session"; hasAccounts: boolean }
> {
  try {
    const resume = await KDF.resumeAuth();

    if (resume.status === "passkey-ready") {
      // Let passkey auth fully restore crypto session
      await passkeyService.login(resume.accountName);
      return { type: "session-restored" };
    }

    if (resume.status === "none") {
      // Wallet resume can be added later if needed
      return { type: "no-session", hasAccounts: true };
    }
  } catch (error) {
    console.warn("Bootstrap resume failed (non-fatal):", error);
  }

  // Fallback: check if any accounts exist
  const accountIndexService = await import("./accountIndexService");
  const hasAccounts = await accountIndexService.hasAccounts();

  return { type: "no-session", hasAccounts };
}

/**
 * Logout
 *
 * Clears:
 * - KDF resume metadata
 * - In-memory crypto session (KEK + DEK)
 *
 * Best-effort, never throws
 */
export async function logout(): Promise<void> {
  try {
    await KDF.clearSessionInfo();
  } catch (e) {
    console.warn("Failed to clear KDF session info:", e);
  }

  try {
    storageManager.clearInMemorySession();
  } catch (e) {
    console.warn("Failed to clear storage session:", e);
  }
}

/**
 * Check if passkey is supported
 */
export function isPasskeySupported(): boolean {
  return passkeyService.isSupported();
}
