/**
 * App-level authentication utilities.
 *
 * These are app concerns (EIP-712 message shape, wallet-based account ID format,
 * key derivation strategy) — not part of the SDK public API.
 */

import { Bytes, Hex, Secp256k1, PublicKey, Address as OxAddress } from "ox";

// ============================================
// Types
// ============================================

/** Branded type for wallet account IDs. Format: `{address}:chain-{chainId}` */
export type WalletAccountId = string & { readonly __brand: "WalletAccountId" };

interface EIP712MessageOptions {
  deterministic?: boolean;
}

interface EIP712TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
  };
  types: {
    ShinobiAuth: readonly [
      { name: "wallet"; type: "address" },
      { name: "action"; type: "string" },
      { name: "message"; type: "string" },
      { name: "version"; type: "string" },
    ];
  };
  primaryType: "ShinobiAuth";
  message: {
    wallet: `0x${string}`;
    action: string;
    message: string;
    version: string;
  };
}

interface WalletCredentials {
  accountId: WalletAccountId;
  privateKey: string;
}

// ============================================
// EIP-712 Message Generation
// ============================================

const DOMAIN = {
  name: "Shinobi Cash",
  version: "1",
} as const;

const TYPES = {
  ShinobiAuth: [
    { name: "wallet", type: "address" },
    { name: "action", type: "string" },
    { name: "message", type: "string" },
    { name: "version", type: "string" },
  ],
} as const;

/** Build the EIP-712 typed data for wallet authentication */
export function getShinobiAuthMessage(
  walletAddress: `0x${string}`,
  chainId: number,
  options?: EIP712MessageOptions
): EIP712TypedData {
  const deterministic = options?.deterministic !== false;

  return {
    domain: { ...DOMAIN, chainId },
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

// ============================================
// Account Identification
// ============================================

const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/** Validate and assert a string is a valid WalletAccountId */
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

  if (!ETHEREUM_ADDRESS_REGEX.test(address!)) {
    throw new Error(
      `Invalid WalletAccountId: address must be a valid Ethereum address (0x + 40 hex chars)`
    );
  }

  const chainId = parseInt(chainIdStr!, 10);
  if (isNaN(chainId) || chainId < 1) {
    throw new Error(`Invalid WalletAccountId: chainId must be a positive integer`);
  }

  return id as WalletAccountId;
}

/** Generate deterministic account ID from wallet address and chain */
function getWalletAccountId(walletAddress: string, chainId: number): WalletAccountId {
  const id = `${walletAddress.toLowerCase()}:chain-${chainId}`;
  return assertWalletAccountId(id);
}

// ============================================
// Key Derivation
// ============================================

/** Derive private key seed from wallet signature using HKDF */
async function deriveKeyGenSeed(
  signature: string,
  chainId: number,
  walletAddress: string
): Promise<string> {
  const signatureBytes = Bytes.fromHex(signature as `0x${string}`);
  const signatureHash = await crypto.subtle.digest("SHA-256", signatureBytes as BufferSource);

  const salt = new TextEncoder().encode(
    `shinobi-wallet-auth-v1:chain-${chainId}:${walletAddress.toLowerCase()}`
  );

  const prk = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(signatureHash),
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const keyGenBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("shinobi-keygen") },
    prk,
    256
  );

  return Hex.fromBytes(new Uint8Array(keyGenBits));
}

/** Generate secp256k1 keys from a 32-byte seed */
function generateKeysFromSeed(seed: string): { publicKey: string; privateKey: string } {
  const seedBytes = Bytes.fromHex(seed as `0x${string}`);

  if (seedBytes.length !== 32) {
    throw new Error(`Invalid seed length: expected 32 bytes, got ${seedBytes.length}`);
  }

  const privateKey = seed.startsWith("0x") ? seed : `0x${seed}`;
  const publicKey = Secp256k1.getPublicKey({ privateKey: privateKey as `0x${string}` });

  return {
    publicKey: PublicKey.toHex(publicKey),
    privateKey,
  };
}

// ============================================
// Credential Derivation (Public API)
// ============================================

/**
 * Derive wallet credentials from a signed EIP-712 message.
 * Returns account identity + private key.
 */
export async function deriveWalletCredentials(
  signature: `0x${string}`,
  chainId: number,
  walletAddress: `0x${string}`
): Promise<WalletCredentials> {
  const accountId = getWalletAccountId(walletAddress, chainId);
  const keyGenSeed = await deriveKeyGenSeed(signature, chainId, walletAddress);
  const { privateKey } = generateKeysFromSeed(keyGenSeed);

  return { accountId, privateKey };
}
