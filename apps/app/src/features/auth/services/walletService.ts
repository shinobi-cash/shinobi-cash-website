/**
 * Wallet Service
 * Wrapper around existing wallet signature-based authentication
 */

import {
  performWalletLogin,
  setupWalletAccount,
  setupWalletAccountWithDerivedKey,
} from "../wallet/walletAuth";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { createAuthError, AuthErrorCode } from "../domain/types";
import { getWalletAccountId } from "../shared";

/**
 * Login with wallet signature
 * Authenticates using wallet signature
 *
 * @param signature - EIP-712 signature from wallet
 * @param walletAddress - Connected wallet address
 * @param chainId - Current chain ID
 * @returns KeyGenerationResult if account exists
 * @throws AuthError if account doesn't exist or authentication fails
 */
export async function login(
  signature: string,
  walletAddress: string,
  chainId: number
): Promise<KeyGenerationResult> {
  try {
    const result = await performWalletLogin(signature, walletAddress, chainId);

    if (!result) {
      const accountId = getWalletAccountId(walletAddress, chainId);
      throw createAuthError(
        AuthErrorCode.ACCOUNT_NOT_FOUND,
        `No wallet account found for ${accountId}. Please create an account first.`
      );
    }

    return result;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      // Already an AuthError, re-throw
      throw error;
    }

    throw createAuthError(
      AuthErrorCode.WALLET_SIGNATURE_FAILED,
      `Wallet authentication failed`,
      error
    );
  }
}

/**
 * Create wallet account
 * Sets up new account using wallet signature
 *
 * @param walletAddress - Connected wallet address
 * @param signature - EIP-712 signature from wallet
 * @param chainId - Current chain ID
 * @param keys - Generated cryptographic keys
 * @throws AuthError if setup fails
 */
export async function createAccount(
  walletAddress: string,
  signature: string,
  chainId: number,
  keys: KeyGenerationResult
): Promise<void> {
  try {
    await setupWalletAccount(walletAddress, signature, chainId, keys);
  } catch (error) {
    throw createAuthError(
      AuthErrorCode.ACCOUNT_ALREADY_EXISTS,
      `Failed to create wallet account`,
      error
    );
  }
}

/**
 * Create wallet account with pre-derived encryption key
 * Used when encryption key is already derived from signature
 *
 * @param walletAddress - Connected wallet address
 * @param chainId - Current chain ID
 * @param encryptionKey - Pre-derived encryption key
 * @param keys - Generated cryptographic keys
 * @throws AuthError if setup fails
 */
export async function createAccountWithKey(
  walletAddress: string,
  chainId: number,
  encryptionKey: Uint8Array,
  keys: KeyGenerationResult
): Promise<void> {
  try {
    await setupWalletAccountWithDerivedKey(walletAddress, chainId, encryptionKey, keys);
  } catch (error) {
    throw createAuthError(
      AuthErrorCode.ACCOUNT_ALREADY_EXISTS,
      `Failed to create wallet account`,
      error
    );
  }
}

/**
 * Get wallet account ID
 * Utility to generate consistent account ID
 *
 * @param walletAddress - Wallet address
 * @param chainId - Chain ID
 * @returns Account ID string
 */
export function getAccountId(walletAddress: string, chainId: number): string {
  return getWalletAccountId(walletAddress, chainId);
}
