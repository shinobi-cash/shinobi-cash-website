/**
 * Chain Configuration
 *
 * Unified chain configuration using viem for metadata and @shinobi-cash/constants for contracts.
 * App-specific features are inferred from contract presence.
 */

import {
  POOL_CHAIN,
  SHINOBI_CASH_SUPPORTED_CHAINS,
} from '@shinobi-cash/constants'

/**
 * Pool chain ID for easy reference
 */
export const POOL_CHAIN_ID = POOL_CHAIN.id

/**
 * Get transaction explorer URL
 */
export const getTxExplorerUrl = (chainId: number | string | bigint, txHash: string): string => {
  const id = Number(chainId)
  const chain = SHINOBI_CASH_SUPPORTED_CHAINS.find(c => c.id === id)
  const explorerUrl = chain?.blockExplorers?.default.url ?? ''
  return `${explorerUrl}/tx/${txHash}`
}
