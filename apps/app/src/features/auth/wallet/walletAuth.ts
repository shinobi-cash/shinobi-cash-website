/**
 * Wallet Authentication
 * file: src/features/auth/wallet/walletAuth.ts
 * Handles wallet signature-based authentication and account setup.
 * Uses HKDF for secure key derivation to prevent signature malleability attacks.
 */

import { storageManager } from "@/lib/storage";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { deriveKeysFromSignature, getWalletAccountId } from "../shared";

// ============ WALLET LOGIN ============

/**
 * Perform wallet-based login for existing wallet-only accounts
 * Returns keys if account exists, null if new user
 */
export async function loginWithWalletIfExists(
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

  const kek = await storageManager.importWalletKEK(encryptionKey);

  // ENVELOPE ENCRYPTION: Unwrap AMK using wallet KEK
  // 1️⃣ Init KEK only for wrapped-AMK store
  const { wrappedAMKStorageAdapter } = await import("@/lib/storage/adapters/IndexedDBAdapter");
  await wrappedAMKStorageAdapter.initializeSession(kek);

  // 2️⃣ Unwrap AMK with wallet KEK
  const amk = await storageManager.unwrapAMK(accountId, "wallet");
  if (!amk) {
    throw new Error("Failed to unwrap AMK with wallet KEK. Account data may be corrupted.");
  }

  // 3️⃣ Finalize session (activates DEK + sets account context)
  await storageManager.initializeAccountSession(accountId, amk);

  // Load account metadata using unwrapped AMK
  const accountData = await storageManager.getAccountData(amk);
  if (!accountData) throw new Error("Failed to load account metadata");

  return {
    publicKey: accountData.publicKey,
    privateKey: amk,
    address: accountData.address,
  };
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

  await storageManager.createWalletAccount(accountId, encryptionKey, {
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
