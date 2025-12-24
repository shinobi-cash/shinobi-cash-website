/**
 * Wallet Operations Protocol
 * Pure functions for wallet signature-based authentication
 * No side effects except storage operations
 *
 * SECURITY: Uses HKDF for key derivation to prevent signature malleability attacks
 * @file features/auth/protocol/walletOperations.ts
 */

import { storageManager, KDF } from "@/lib/storage";
import { restoreFromMnemonic, type KeyGenerationResult } from "@shinobi-cash/core";
import { deriveKeysFromSignature } from "./crypto";
import { getWalletAccountId } from "./accountId";

// ============ WALLET LOGIN ============

/**
 * Perform wallet-based login for existing wallet-only accounts
 * Pure function - returns keys if account exists, null if new user
 *
 * @param signature - Wallet signature (hex string with 0x prefix)
 * @param walletAddress - Wallet address
 * @param chainId - Chain ID for replay protection
 * @returns KeyGenerationResult if account exists, null if new account
 */
export async function performWalletLogin(
  signature: string,
  walletAddress: string,
  chainId: number
): Promise<KeyGenerationResult | null> {
  // SECURITY: Derive encryption key using HKDF with chain binding
  const { encryptionKey } = await deriveKeysFromSignature(signature, chainId, walletAddress);

  // Use wallet address + chain ID as account ID for chain-specific accounts
  const accountId = getWalletAccountId(walletAddress, chainId);

  // Check if account exists
  const accountExists = await storageManager.accountExists(accountId);

  if (!accountExists) {
    // New account - return null to indicate account creation flow
    return null;
  }

  // Existing account - initialize session and load data
  try {
    await storageManager.initializeWalletAccountSession(accountId, encryptionKey);

    const accountData = await storageManager.getAccountData();
    if (!accountData) {
      // Account exists but data not found - treat as new account
      console.warn("Account exists but data not found, treating as new account");
      return null;
    }

    // Restore keys from stored mnemonic
    const { publicKey, privateKey, address } = restoreFromMnemonic(accountData.mnemonic);

    // Store session info (wallet-based auth)
    await KDF.storeSessionInfo(accountId, "passkey"); // Using "passkey" as auth method for now

    return {
      publicKey,
      privateKey,
      address,
      mnemonic: accountData.mnemonic,
    } as KeyGenerationResult;
  } catch (error) {
    // Failed to decrypt or load account data - treat as new account
    console.warn("Failed to load account data, treating as new account:", error);
    return null;
  }
}

// ============ WALLET ACCOUNT SETUP ============

/**
 * Setup wallet-only account (no passkey)
 * Pure function - stores encrypted data using signature-derived key
 *
 * @param walletAddress - Wallet address
 * @param signature - Wallet signature for encryption
 * @param chainId - Chain ID for chain-specific account
 * @param generatedKeys - Keys to encrypt and store
 */
export async function setupWalletAccount(
  walletAddress: string,
  signature: string,
  chainId: number,
  generatedKeys: KeyGenerationResult
): Promise<void> {
  // SECURITY: Derive encryption key using HKDF with chain binding
  const { encryptionKey } = await deriveKeysFromSignature(signature, chainId, walletAddress);

  // Delegate to shared implementation
  await setupWalletAccountWithDerivedKey(walletAddress, chainId, encryptionKey, generatedKeys);
}

/**
 * Setup wallet-only account with pre-derived encryption key
 * Used when encryption key is already derived (e.g., from generateKeys flow)
 *
 * TRANSACTIONAL: Both session initialization and data save succeed atomically
 *
 * @param walletAddress - Wallet address
 * @param chainId - Chain ID for chain-specific account
 * @param encryptionKey - Pre-derived encryption key from HKDF
 * @param generatedKeys - Keys to encrypt and store
 */
export async function setupWalletAccountWithDerivedKey(
  walletAddress: string,
  chainId: number,
  encryptionKey: Uint8Array,
  generatedKeys: KeyGenerationResult
): Promise<void> {
  const accountId = getWalletAccountId(walletAddress, chainId);

  // TRANSACTIONAL: Use atomic setup to prevent partial state
  await storageManager.setupWalletAccountTransaction(accountId, encryptionKey, {
    walletAddress,
    mnemonic: generatedKeys.mnemonic,
    publicKey: generatedKeys.publicKey,
  });
}

// ============ SIGNATURE PROCESSING ============

/**
 * Generate keys from wallet signature using secure HKDF derivation
 * SECURITY: Replaces old insecure signature slicing with HKDF
 *
 * @param signature - Wallet signature (hex string with 0x prefix)
 * @param chainId - Chain ID for chain binding
 * @param walletAddress - Wallet address
 * @returns Key generation seed (hex string)
 */
export async function deriveKeyGenSeed(
  signature: string,
  chainId: number,
  walletAddress: string
): Promise<string> {
  const { keyGenSeed } = await deriveKeysFromSignature(signature, chainId, walletAddress);
  return keyGenSeed;
}

/**
 * Extract encryption key from wallet signature using secure HKDF derivation
 * SECURITY: Replaces old insecure signature slicing with HKDF
 *
 * @param signature - Wallet signature (hex string with 0x prefix)
 * @param chainId - Chain ID for chain binding
 * @param walletAddress - Wallet address
 * @returns Encryption key (Uint8Array)
 */
export async function deriveEncryptionKey(
  signature: string,
  chainId: number,
  walletAddress: string
): Promise<Uint8Array> {
  const { encryptionKey } = await deriveKeysFromSignature(signature, chainId, walletAddress);
  return encryptionKey;
}
