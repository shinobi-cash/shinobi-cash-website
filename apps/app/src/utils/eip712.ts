/**
 * EIP-712 typed data utilities for Shinobi Cash authentication
 */

// EIP-712 domain and message structure
const DOMAIN = {
  name: "Shinobi Cash",
  version: "1",
  chainId: 1, // Will be overridden with actual chain
} as const;

const TYPES = {
  ShinobiAuth: [
    { name: "message", type: "string" },
    { name: "timestamp", type: "uint256" },
    { name: "action", type: "string" },
  ],
} as const;

/**
 * Generate EIP-712 typed data message for wallet signature
 * For wallet-based accounts (login/encryption), uses deterministic message without timestamp
 * For temporary key generation, can use timestamp for uniqueness
 */
export function getEIP712Message(
  walletAddress: string,
  chainId?: number,
  options?: { deterministic?: boolean }
) {
  // For wallet-based accounts, use deterministic signature (no timestamp)
  // This ensures the same signature is generated each time for encryption/decryption
  const useDeterministic = options?.deterministic !== false; // Default to deterministic

  const message = useDeterministic
    ? {
        message:
          "Sign this message to access your Shinobi Cash account. This signature will be used to deterministically generate your encryption keys. This will not trigger any blockchain transaction or cost gas.",
        timestamp: BigInt(0), // Fixed timestamp for deterministic signature
        action: "shinobi-auth",
      }
    : {
        message:
          "Sign this message to create your Shinobi Cash account. This signature will be used to deterministically generate your private keys. This will not trigger any blockchain transaction or cost gas.",
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        action: "create-account",
      };

  const domain = {
    ...DOMAIN,
    chainId: chainId ?? 1,
  };

  return {
    domain,
    types: TYPES,
    primaryType: "ShinobiAuth" as const,
    message,
  };
}
