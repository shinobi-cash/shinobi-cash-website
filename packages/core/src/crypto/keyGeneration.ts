/**
 * Key Generation Utilities
 *
 * Handles wallet signature-based key derivation using HKDF
 *
 * SECURITY: Uses HKDF for proper key derivation from wallet signatures
 * to prevent signature malleability and ensure domain separation.
 */

import { ethers } from 'ethers';

/**
 * Result of key generation
 */
export interface KeyGenerationResult {
  /** Uncompressed public key */
  publicKey: string;

  /** Private key (hex string) */
  privateKey: string;

  /** Ethereum address */
  address: string;
}

/**
 * Derive keys from wallet signature using HKDF
 *
 * SECURITY NOTES:
 * - ECDSA signatures are NOT uniformly random
 * - Signature malleability can cause collisions
 * - Domain separation prevents key reuse across contexts
 *
 * @param signature - ECDSA signature from wallet (0x-prefixed hex)
 * @param chainId - Chain ID for replay protection
 * @param walletAddress - Wallet address for binding
 * @returns Derived keys for key generation and encryption
 */
export async function deriveKeysFromSignature(
  signature: string,
  chainId: number,
  walletAddress: string
): Promise<{
  keyGenSeed: string;
  encryptionKey: Uint8Array;
}> {
  // Remove 0x prefix
  const signatureHex = signature.startsWith('0x') ? signature.slice(2) : signature;
  const signatureBytes = hexToBytes(signatureHex);

  // Step 1: Hash the signature first (never use raw signature)
  const signatureHash = await crypto.subtle.digest('SHA-256', signatureBytes as BufferSource);

  // Step 2: Create salt with version and chain binding
  const salt = new TextEncoder().encode(
    `shinobi-wallet-auth-v1:chain-${chainId}:${walletAddress.toLowerCase()}`
  );

  // Step 3: Import the hash as key material for HKDF
  const prk = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(signatureHash),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Step 4: Derive key generation seed (32 bytes)
  const keyGenInfo = new TextEncoder().encode('shinobi-keygen');
  const keyGenBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: keyGenInfo,
    },
    prk,
    256 // 32 bytes
  );

  // Step 5: Derive encryption key (32 bytes) with different info for domain separation
  const encryptionInfo = new TextEncoder().encode('shinobi-encryption');
  const encryptionBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: encryptionInfo,
    },
    prk,
    256 // 32 bytes
  );

  return {
    keyGenSeed: bytesToHex(new Uint8Array(keyGenBits)),
    encryptionKey: new Uint8Array(encryptionBits),
  };
}

/**
 * Generate keys from wallet signature using secure HKDF derivation
 *
 * SECURITY: Uses HKDF with chain binding for secure key derivation
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

/**
 * Generate keys from random seed (for deterministic generation)
 *
 * SECURITY: Strict validation - never auto-pad or truncate keys.
 * Invalid seed lengths indicate a bug that should fail loudly.
 *
 * @param randomSeed - Random seed as hex string (must be exactly 32 bytes / 64 hex chars)
 * @returns Generated keys
 * @throws Error if seed is not exactly 32 bytes
 */
export function generateKeysFromRandomSeed(randomSeed: string): KeyGenerationResult {
  const seedBytes = hexToBytes(randomSeed);

  // STRICT VALIDATION: Never auto-pad keys. Fail loudly.
  if (seedBytes.length !== 32) {
    throw new Error(`Invalid seed length: expected 32 bytes, got ${seedBytes.length}`);
  }

  // Create wallet from private key bytes
  const privateKeyHex = '0x' + bytesToHex(seedBytes);
  const wallet = new ethers.Wallet(privateKeyHex);

  return {
    publicKey: wallet.signingKey.publicKey,
    privateKey: wallet.privateKey,
    address: wallet.address,
  };
}

// Helper functions
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
