import { ethers } from "ethers";

/**
 * Result of key generation
 */
export interface KeyGenerationResult {
  publicKey: string;
  privateKey: string;
}

/**
 * Derive keys from wallet signature using HKDF
 * * Flow:
 * 1. Signature -> SHA-256 -> IKM (Input Keying Material)
 * 2. HKDF-Extract(salt, IKM) -> PRK
 * 3. HKDF-Expand(PRK, info) -> OKM (Output Keying Material)
 */
export async function deriveKeysFromSignature(
  signature: string,
  chainId: number,
  walletAddress: string
): Promise<{
  keyGenSeed: string;
  encryptionKey: Uint8Array;
}> {
  // 1. Normalize Input
  const signatureBytes = ethers.getBytes(signature);

  // 2. Hash signature to normalize entropy (Security Best Practice)
  // This ensures the input to HKDF is always uniform length
  const signatureHash = await crypto.subtle.digest("SHA-256", signatureBytes as BufferSource);

  // 3. Create Salt (Binds key to specific chain & address)
  const salt = new TextEncoder().encode(
    `shinobi-wallet-auth-v1:chain-${chainId}:${walletAddress.toLowerCase()}`
  );

  // 4. Import as Raw Key Material
  const keyMaterial = await crypto.subtle.importKey("raw", signatureHash, { name: "HKDF" }, false, [
    "deriveBits",
  ]);

  // 5. Derive specific keys
  // We execute this in parallel for performance
  const [keyGenBits, encryptionBits] = await Promise.all([
    // Key Generation Seed
    crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt,
        info: new TextEncoder().encode("shinobi-keygen"),
      },
      keyMaterial,
      256
    ),
    // Encryption Key
    crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt,
        info: new TextEncoder().encode("shinobi-encryption"),
      },
      keyMaterial,
      256
    ),
  ]);

  return {
    keyGenSeed: ethers.hexlify(new Uint8Array(keyGenBits)),
    encryptionKey: new Uint8Array(encryptionBits),
  };
}

/**
 * Generate keys from a 32-byte hex seed
 */
export function generateKeysFromRandomSeed(randomSeed: string): KeyGenerationResult {
  const seedBytes = ethers.getBytes(randomSeed);

  // STRICT VALIDATION: Never auto-pad keys. Fail loudly.
  if (seedBytes.length !== 32) {
    throw new Error(`Invalid seed length: expected 32 bytes, got ${seedBytes.length}`);
  }

  // Create wallet (Ethers handles the private key parsing securely)
  const wallet = new ethers.Wallet(randomSeed);

  return {
    publicKey: wallet.signingKey.publicKey,
    privateKey: wallet.privateKey,
  };
}

/**
 * EIP-712 typed data utilities for Shinobi Cash authentication
 */

// EIP-712 domain and message structure
const DOMAIN = {
  name: "Shinobi Cash",
  version: "1",
} as const;

const TYPES = {
  ShinobiAuth: [
    { name: "wallet", type: "address" },
    { name: "action", type: "string" },
    { name: "message", type: "string" },
    { name: "version", type: "string" }, // static or time-based
  ],
} as const;

/**
 * Generate EIP-712 typed data message for wallet signature
 * For wallet-based accounts (login/encryption), uses deterministic message without timestamp
 * For temporary key generation, can use timestamp for uniqueness
 */
export function getEIP712Message(
  walletAddress: `0x${string}`,
  chainId: number,
  options?: { deterministic?: boolean }
) {
  const deterministic = options?.deterministic !== false;

  return {
    domain: {
      ...DOMAIN,
      chainId,
    },
    types: TYPES,
    primaryType: "ShinobiAuth" as const,
    message: {
      wallet: walletAddress,
      action: deterministic ? "shinobi-auth" : "create-account",
      message: deterministic
        ? "Sign to access your Shinobi Cash account."
        : "Sign to create your Shinobi Cash account.",
      version: "1",
    },
  };
}

/**
 * Type for wallet account IDs
 * Prevents accidental use of arbitrary strings as account IDs
 */
export type WalletAccountId = string & { readonly __brand: "WalletAccountId" };

/**
 * Validate and assert a string is a valid WalletAccountId
 *
 * Format: `{address}:chain-{chainId}`
 * Example: `0x123...:chain-1`
 *
 * @param id - String to validate
 * @returns WalletAccountId
 * @throws Error if format is invalid
 */
export function assertWalletAccountId(id: string): WalletAccountId {
  if (!id || typeof id !== "string") {
    throw new Error("Invalid WalletAccountId: must be a non-empty string");
  }

  if (!id.includes(":chain-")) {
    throw new Error(
      `Invalid WalletAccountId format: "${id}" (expected format: address:chain-{chainId})`
    );
  }

  const parts = id.split(":chain-");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid WalletAccountId format: "${id}" (multiple ":chain-" separators found)`
    );
  }

  const [address, chainIdStr] = parts;

  // Validate address format (basic check)
  if (!address.startsWith("0x") || address.length < 10) {
    throw new Error(`Invalid WalletAccountId: address portion invalid`);
  }

  // Validate chainId is numeric
  const chainId = parseInt(chainIdStr, 10);
  if (isNaN(chainId) || chainId < 1) {
    throw new Error(`Invalid WalletAccountId: chainId must be a positive integer`);
  }

  return id as WalletAccountId;
}

/**
 * Parse a WalletAccountId into its components
 *
 * @param id - Validated WalletAccountId
 * @returns Object with walletAddress and chainId
 */
export function parseWalletAccountId(id: WalletAccountId): {
  walletAddress: string;
  chainId: number;
} {
  const [address, chainIdStr] = id.split(":chain-");
  return {
    walletAddress: address,
    chainId: parseInt(chainIdStr, 10),
  };
}

/**
 * Generate deterministic account ID from wallet address and chain
 * Used consistently across all wallet-based authentication flows
 *
 * Format: `{address}:chain-{chainId}`
 * Example: `0x123...:chain-1`
 *
 * @param walletAddress - Ethereum wallet address (0x-prefixed)
 * @param chainId - Chain ID (1 = mainnet, 11155111 = sepolia, etc)
 * @returns Deterministic account ID
 */
export function getWalletAccountId(walletAddress: string, chainId: number): WalletAccountId {
  const id = `${walletAddress.toLowerCase()}:chain-${chainId}`;
  return assertWalletAccountId(id);
}
