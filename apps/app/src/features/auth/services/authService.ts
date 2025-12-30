/**
 * Auth Service
 * Main authentication orchestration layer
 * Coordinates between passkey/wallet services and session management
 */

import type { KeyGenerationResult } from "@shinobi-cash/core";
import type { AuthMethod, AuthSession } from "../domain/types";
import * as passkeyService from "./passkeyService";
import * as walletService from "./walletService";
import * as sessionService from "./sessionService";

/**
 * Authenticate with existing account
 * Routes to appropriate auth method and creates session
 *
 * @param accountId - Account identifier
 * @param method - Authentication method (passkey or wallet)
 * @param walletParams - Required for wallet auth (signature, walletAddress, chainId)
 * @returns AuthSession on successful authentication
 * @throws AuthError if authentication fails
 */
export async function authenticate(
  accountId: string,
  method: AuthMethod,
  walletParams?: {
    signature: string;
    walletAddress: string;
    chainId: number;
  }
): Promise<AuthSession> {
  let keys: KeyGenerationResult;

  if (method === "passkey") {
    // Passkey authentication
    keys = await passkeyService.login(accountId);
  } else {
    // Wallet authentication
    if (!walletParams) {
      throw new Error("Wallet parameters required for wallet authentication");
    }

    const { signature, walletAddress, chainId } = walletParams;
    keys = await walletService.login(signature, walletAddress, chainId);
  }

  // Create session from keys
  return await sessionService.createSession(accountId, keys, method);
}

/**
 * Create new account
 * Routes to appropriate account creation method and creates session
 *
 * @param accountId - Account identifier (accountName for passkey, accountId for wallet)
 * @param method - Authentication method
 * @param keys - Generated cryptographic keys
 * @param walletParams - Required for wallet account creation
 * @returns AuthSession for the newly created account
 * @throws AuthError if account creation fails
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
): Promise<AuthSession> {
  if (method === "passkey") {
    // Create passkey account
    await passkeyService.createAccount(accountId, keys);
  } else {
    // Create wallet account
    if (!walletParams) {
      throw new Error("Wallet parameters required for wallet account creation");
    }

    const { signature, walletAddress, chainId } = walletParams;
    await walletService.createAccount(walletAddress, signature, chainId, keys);
  }

  // Create session from keys
  return await sessionService.createSession(accountId, keys, method);
}

/**
 * Bootstrap authentication system
 * Attempts to restore session, falls back to listing accounts
 *
 * @returns Object with restoration status and session/accounts
 */
export async function bootstrap(): Promise<
  | { type: "session-restored"; session: AuthSession }
  | { type: "no-session"; hasAccounts: boolean }
> {
  // Try to restore existing session
  const session = await sessionService.tryRestoreSession();

  if (session) {
    return { type: "session-restored", session };
  }

  // Check if any accounts exist
  const accountIndexService = await import("./accountIndexService");
  const hasAccounts = await accountIndexService.hasAccounts();

  return { type: "no-session", hasAccounts };
}

/**
 * Logout
 * Clears session and returns to unauthenticated state
 */
export async function logout(): Promise<void> {
  await sessionService.clearSession();
}

/**
 * Check if passkey is supported
 *
 * @returns true if WebAuthn is available
 */
export function isPasskeySupported(): boolean {
  return passkeyService.isSupported();
}
