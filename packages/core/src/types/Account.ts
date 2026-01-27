/**
 * Account Types
 *
 * Types and utilities for wallet-based account identification.
 */

/**
 * Branded type for wallet account IDs
 * Prevents accidental use of arbitrary strings as account IDs
 *
 * Format: `{address}:chain-{chainId}`
 * Example: `0x1234...abcd:chain-421614`
 */
export type WalletAccountId = string & { readonly __brand: 'WalletAccountId' };

/**
 * Ethereum address regex pattern (0x + 40 hex chars)
 */
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Validate and assert a string is a valid WalletAccountId
 *
 * @param id - String to validate
 * @returns WalletAccountId
 * @throws Error if format is invalid
 *
 * @example
 * ```typescript
 * const accountId = assertWalletAccountId("0x1234...abcd:chain-421614");
 * ```
 */
export function assertWalletAccountId(id: string): WalletAccountId {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid WalletAccountId: must be a non-empty string');
  }

  if (!id.includes(':chain-')) {
    throw new Error(`Invalid WalletAccountId format: "${id}" (expected format: address:chain-{chainId})`);
  }

  const parts = id.split(':chain-');
  if (parts.length !== 2) {
    throw new Error(`Invalid WalletAccountId format: "${id}" (multiple ":chain-" separators found)`);
  }

  const [address, chainIdStr] = parts;

  // Validate address format (proper Ethereum address)
  if (!ETHEREUM_ADDRESS_REGEX.test(address!)) {
    throw new Error(`Invalid WalletAccountId: address must be a valid Ethereum address (0x + 40 hex chars)`);
  }

  // Validate chainId is numeric
  const chainId = parseInt(chainIdStr!, 10);
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
 *
 * @example
 * ```typescript
 * const { walletAddress, chainId } = parseWalletAccountId(accountId);
 * // walletAddress: "0x1234...abcd"
 * // chainId: 421614
 * ```
 */
export function parseWalletAccountId(id: WalletAccountId): {
  walletAddress: `0x${string}`;
  chainId: number;
} {
  const [address, chainIdStr] = id.split(':chain-');
  return {
    walletAddress: address as `0x${string}`,
    chainId: parseInt(chainIdStr!, 10),
  };
}

/**
 * Generate deterministic account ID from wallet address and chain
 * Used consistently across all wallet-based authentication flows
 *
 * @param walletAddress - Ethereum wallet address (0x-prefixed, 40 hex chars)
 * @param chainId - Chain ID (e.g., 421614 for Arbitrum Sepolia)
 * @returns Deterministic account ID
 * @throws Error if address format is invalid
 *
 * @example
 * ```typescript
 * const accountId = getWalletAccountId("0x1234...abcd", 421614);
 * // Returns: "0x1234...abcd:chain-421614"
 * ```
 */
export function getWalletAccountId(walletAddress: string, chainId: number): WalletAccountId {
  const id = `${walletAddress.toLowerCase()}:chain-${chainId}`;
  return assertWalletAccountId(id);
}
