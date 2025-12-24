/**
 * Account Persistence Service
 * Centralized account storage operations for auth feature
 * Provides high-level account management separate from low-level storage
 * @file features/auth/services/accountPersistence.ts
 */

import { storageManager } from "@/lib/storage";
import { getWalletAccountId } from "@/features/auth/protocol";
import type { KeyGenerationResult } from "@shinobi-cash/core";

/**
 * Save wallet account with transactional guarantees
 * Prevents partial state (session initialized without data, or vice versa)
 *
 * @param walletAddress - Wallet address
 * @param chainId - Chain ID for chain-specific account
 * @param encryptionKey - Encryption key derived from wallet signature
 * @param keys - Generated keys to store
 */
export async function saveWalletAccount(
  walletAddress: string,
  chainId: number,
  encryptionKey: Uint8Array,
  keys: KeyGenerationResult
): Promise<void> {
  const accountId = getWalletAccountId(walletAddress, chainId);

  await storageManager.setupWalletAccountTransaction(accountId, encryptionKey, {
    walletAddress,
    mnemonic: keys.mnemonic,
    publicKey: keys.publicKey,
  });
}

/**
 * Check if wallet account exists for given address and chain
 * Uses deterministic accountId generation
 *
 * @param walletAddress - Wallet address
 * @param chainId - Chain ID
 * @returns true if account exists
 */
export async function walletAccountExists(
  walletAddress: string,
  chainId: number
): Promise<boolean> {
  const accountId = getWalletAccountId(walletAddress, chainId);
  return await storageManager.accountExists(accountId);
}

/**
 * List all account names from storage
 * @returns Array of account names
 */
export async function listAllAccounts(): Promise<string[]> {
  return await storageManager.listAccountNames();
}

/**
 * Check if any passkey account exists
 * @param accountName - Account name to check
 * @returns true if passkey exists for account
 */
export async function passkeyExistsForAccount(accountName: string): Promise<boolean> {
  return await storageManager.passkeyExists(accountName);
}
