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
    { name: "nonce", type: "string" }, // static or time-based
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
      nonce: deterministic ? "static-v1" : String(Date.now()),
    },
  };
}
