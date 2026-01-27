/**
 * Authentication Utilities
 *
 * EIP-712 typed data utilities for Shinobi Cash wallet authentication.
 */

/**
 * EIP-712 domain configuration
 */
const DOMAIN = {
  name: 'Shinobi Cash',
  version: '1',
} as const;

/**
 * EIP-712 type definitions for authentication
 */
const TYPES = {
  ShinobiAuth: [
    { name: 'wallet', type: 'address' },
    { name: 'action', type: 'string' },
    { name: 'message', type: 'string' },
    { name: 'version', type: 'string' },
  ],
} as const;

/**
 * Options for EIP-712 message generation
 */
export interface EIP712MessageOptions {
  /**
   * If true, generates a deterministic message for consistent key derivation.
   * If false, generates a message for account creation.
   * @default true
   */
  deterministic?: boolean;
}

/**
 * EIP-712 typed data structure for wallet signing
 */
export interface EIP712TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
  };
  types: typeof TYPES;
  primaryType: 'ShinobiAuth';
  message: {
    wallet: `0x${string}`;
    action: string;
    message: string;
    version: string;
  };
}

/**
 * Generate EIP-712 typed data message for wallet signature
 *
 * For wallet-based accounts (login/encryption), uses deterministic message
 * to ensure the same signature is generated each time for key derivation.
 *
 * @param walletAddress - Ethereum wallet address (0x-prefixed)
 * @param chainId - Chain ID for domain separation
 * @param options - Message generation options
 * @returns EIP-712 typed data ready for signing
 *
 * @example
 * ```typescript
 * // For authentication (deterministic)
 * const message = getShinobiAuthMessage("0x1234...", 421614, { deterministic: true });
 *
 * // For account creation
 * const message = getShinobiAuthMessage("0x1234...", 421614, { deterministic: false });
 * ```
 */
export function getShinobiAuthMessage(
  walletAddress: `0x${string}`,
  chainId: number,
  options?: EIP712MessageOptions,
): EIP712TypedData {
  const deterministic = options?.deterministic !== false;

  return {
    domain: {
      ...DOMAIN,
      chainId,
    },
    types: TYPES,
    primaryType: 'ShinobiAuth' as const,
    message: {
      wallet: walletAddress,
      action: deterministic ? 'shinobi-auth' : 'create-account',
      message: deterministic
        ? 'Sign to access your Shinobi Cash account.'
        : 'Sign to create your Shinobi Cash account.',
      version: '1',
    },
  };
}
