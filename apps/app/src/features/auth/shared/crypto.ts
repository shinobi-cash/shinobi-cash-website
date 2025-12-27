/**
 * Cryptographic Utilities for Auth
 * Secure key derivation and domain separation
 *
 * SECURITY: Uses HKDF for proper key derivation from wallet signatures
 * to prevent signature malleability and ensure domain separation.
 * @file features/auth/protocol/crypto.ts
 */

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
  const signatureHex = signature.startsWith("0x") ? signature.slice(2) : signature;
  const signatureBytes = hexToBytes(signatureHex);

  // Step 1: Hash the signature first (never use raw signature)
  const signatureHash = await crypto.subtle.digest("SHA-256", signatureBytes as BufferSource);

  // Step 2: Create salt with version and chain binding
  const salt = new TextEncoder().encode(
    `shinobi-wallet-auth-v1:chain-${chainId}:${walletAddress.toLowerCase()}`
  );

  // Step 3: Import the hash as key material for HKDF
  const prk = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(signatureHash), // Ensure proper type
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Step 4: Derive key generation seed (32 bytes)
  const keyGenInfo = new TextEncoder().encode("shinobi-keygen");
  const keyGenBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: keyGenInfo,
    },
    prk,
    256 // 32 bytes
  );

  // Step 5: Derive encryption key (32 bytes) with different info for domain separation
  const encryptionInfo = new TextEncoder().encode("shinobi-encryption");
  const encryptionBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
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
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
