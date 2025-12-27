/**
 * Wallet Authentication
 * file: src/features/auth/wallet/walletAuth.ts
 * Handles wallet signature-based authentication and account setup.
 * Uses HKDF for secure key derivation to prevent signature malleability attacks.
 */

import { storageManager, KDF } from "@/lib/storage";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { deriveKeysFromSignature, getWalletAccountId } from "../shared";

// ============ WALLET LOGIN ============

/**
 * Perform wallet-based login for existing wallet-only accounts
 * Returns keys if account exists, null if new user
 */
export async function performWalletLogin(
  signature: string,
  walletAddress: string,
  chainId: number
): Promise<KeyGenerationResult | null> {
  // Derive encryption key using HKDF with chain binding
  const { encryptionKey } = await deriveKeysFromSignature(signature, chainId, walletAddress);

  // Use wallet address + chain ID as account ID for chain-specific accounts
  const accountId = getWalletAccountId(walletAddress, chainId);

  const accountExists = await storageManager.accountExists(accountId);

  if (!accountExists) {
    return null;
  }

  // Existing account - initialize session and load data
  try {
    await storageManager.initializeWalletAccountSession(accountId, encryptionKey);

    const accountData = await storageManager.getAccountData();
    if (!accountData) {
      console.warn("Account exists but data not found, treating as new account");
      return null;
    }

    // Store session info (wallet-based auth)
    await KDF.storeSessionInfo(accountId, "wallet");

    // Return keys (mnemonic not stored, will be empty array)
    return {
      publicKey: accountData.publicKey,
      privateKey: accountData.privateKey,
      address: accountData.address,
      mnemonic: [], // Not stored in database
    };
  } catch (error) {
    console.warn("Failed to load account data, treating as new account:", error);
    return null;
  }
}

// ============ WALLET ACCOUNT SETUP ============

/**
 * Setup wallet-only account (no passkey)
 * Stores encrypted data using signature-derived key
 */
export async function setupWalletAccount(
  walletAddress: string,
  signature: string,
  chainId: number,
  generatedKeys: KeyGenerationResult
): Promise<void> {
  const { encryptionKey } = await deriveKeysFromSignature(signature, chainId, walletAddress);

  await setupWalletAccountWithDerivedKey(walletAddress, chainId, encryptionKey, generatedKeys);
}

/**
 * Setup wallet-only account with pre-derived encryption key
 * Used when encryption key is already derived (e.g., from generateKeys flow)
 *
 * TRANSACTIONAL: Both session initialization and data save succeed atomically
 */
export async function setupWalletAccountWithDerivedKey(
  walletAddress: string,
  chainId: number,
  encryptionKey: Uint8Array,
  generatedKeys: KeyGenerationResult
): Promise<void> {
  const accountId = getWalletAccountId(walletAddress, chainId);

  await storageManager.setupWalletAccountTransaction(accountId, encryptionKey, {
    walletAddress,
    chainId,
    publicKey: generatedKeys.publicKey,
    privateKey: generatedKeys.privateKey,
    address: generatedKeys.address,
  });
}

// ============ SIGNATURE PROCESSING ============

/**
 * Generate keys from wallet signature using secure HKDF derivation
 * Replaces old insecure signature slicing with HKDF
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
 * Replaces old insecure signature slicing with HKDF
 */
export async function deriveEncryptionKey(
  signature: string,
  chainId: number,
  walletAddress: string
): Promise<Uint8Array> {
  const { encryptionKey } = await deriveKeysFromSignature(signature, chainId, walletAddress);
  return encryptionKey;
}
