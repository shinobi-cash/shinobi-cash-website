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
