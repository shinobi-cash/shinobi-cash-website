/**
 * Key Generation Protocol
 * Pure functions for cryptographic key generation and derivation
 * No side effects - pure crypto operations
 *
 * SECURITY: Uses HKDF for wallet signature-based key derivation
 * @file features/auth/protocol/keyGeneration.ts
 */

import { generateKeysFromRandomSeed, type KeyGenerationResult } from "@shinobi-cash/core";
import { deriveKeysFromSignature } from "./crypto";

// ============ KEY GENERATION ============

/**
 * Generate new keys from a random seed
 * Pure function - deterministic generation from seed
 *
 * @param seed - Hex string seed (64 characters)
 * @returns KeyGenerationResult with publicKey, privateKey, address, mnemonic
 */
export function generateKeysFromSeed(seed: string): KeyGenerationResult {
  return generateKeysFromRandomSeed(seed);
}

/**
 * Generate keys from wallet signature using secure HKDF derivation
 * SECURITY: Replaces old insecure signature slicing with HKDF + chain binding
 *
 * @param signature - Wallet signature (hex string with 0x prefix)
 * @param chainId - Chain ID for replay protection
 * @param walletAddress - Wallet address for binding
 * @returns KeyGenerationResult
 */
export async function generateKeysFromWalletSignature(
  signature: string,
  chainId: number,
  walletAddress: string
): Promise<KeyGenerationResult> {
  // SECURITY: Use HKDF to derive seed from signature with chain binding
  const { keyGenSeed } = await deriveKeysFromSignature(signature, chainId, walletAddress);

  // Generate keys from derived seed
  return generateKeysFromRandomSeed(keyGenSeed);
}
