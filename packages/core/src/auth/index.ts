/**
 * @shinobi-cash/core/auth
 */

import { Bytes, Hex, Secp256k1, PublicKey, Address as OxAddress } from "ox";
import { SNARK_SCALAR_FIELD } from "../crypto/constants.js";
import type {
  WalletAccountId,
  EIP712MessageOptions,
  EIP712TypedData,
  KeyGenerationResult,
} from "./types.js";

// Re-export types
export type {
  WalletAccountId,
  EIP712MessageOptions,
  EIP712TypedData,
  KeyGenerationResult,
} from "./types.js";

// ============================================
// Key Parsing
// ============================================

const modF = (x: bigint) => ((x % SNARK_SCALAR_FIELD) + SNARK_SCALAR_FIELD) % SNARK_SCALAR_FIELD;

/** Parse and normalize a user key to a BN254 field element */
export function parseUserKey(userKey: string | bigint): bigint {
  if (typeof userKey === "bigint") return modF(userKey);
  const s = userKey.trim();
  if (s.startsWith("0x")) return modF(BigInt(s));
  return modF(BigInt(s));
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

/** Parse a WalletAccountId into its components */
export function parseWalletAccountId(id: WalletAccountId): {
  walletAddress: `0x${string}`;
  chainId: number;
} {
  const [address, chainIdStr] = id.split(":chain-");
  return {
    walletAddress: address as `0x${string}`,
    chainId: parseInt(chainIdStr!, 10),
  };
}

/** Generate deterministic account ID from wallet address and chain */
export function getWalletAccountId(walletAddress: string, chainId: number): WalletAccountId {
  const id = `${walletAddress.toLowerCase()}:chain-${chainId}`;
  return assertWalletAccountId(id);
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
// Key Derivation
// ============================================

/** Derive keys from wallet signature using HKDF */
export async function deriveKeysFromSignature(
  signature: string,
  chainId: number,
  walletAddress: string
): Promise<{
  keyGenSeed: string;
  encryptionKey: Uint8Array;
}> {
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

  const encryptionBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode("shinobi-encryption") },
    prk,
    256
  );

  return {
    keyGenSeed: Hex.fromBytes(new Uint8Array(keyGenBits)),
    encryptionKey: new Uint8Array(encryptionBits),
  };
}

/** Generate keys from seed */
export function generateKeysFromRandomSeed(randomSeed: string): KeyGenerationResult {
  const seedBytes = Bytes.fromHex(randomSeed as `0x${string}`);

  if (seedBytes.length !== 32) {
    throw new Error(`Invalid seed length: expected 32 bytes, got ${seedBytes.length}`);
  }

  const privateKeyHex = randomSeed.startsWith("0x") ? randomSeed : `0x${randomSeed}`;
  const publicKey = Secp256k1.getPublicKey({ privateKey: privateKeyHex as `0x${string}` });
  const address = OxAddress.checksum(OxAddress.fromPublicKey(publicKey));

  return {
    publicKey: PublicKey.toHex(publicKey),
    privateKey: privateKeyHex,
    address,
  };
}
