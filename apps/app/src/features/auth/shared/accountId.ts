/**
 * Account ID Utilities
 * Deterministic account ID generation for wallet-based accounts
 * @file features/auth/protocol/accountId.ts
 */

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
export function getWalletAccountId(walletAddress: string, chainId: number): string {
  return `${walletAddress.toLowerCase()}:chain-${chainId}`;
}

/**
 * Parse wallet account ID to extract address and chain ID
 *
 * @param accountId - Account ID in format `{address}:chain-{chainId}`
 * @returns Object with walletAddress and chainId, or null if invalid format
 */
export function parseWalletAccountId(
  accountId: string
): { walletAddress: string; chainId: number } | null {
  const match = accountId.match(/^(0x[a-f0-9]{40}):chain-(\d+)$/i);
  if (!match) return null;

  return {
    walletAddress: match[1].toLowerCase(),
    chainId: parseInt(match[2], 10),
  };
}
