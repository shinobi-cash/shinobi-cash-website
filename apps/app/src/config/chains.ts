/**
 * Chain Configuration
 *
 * Re-exports viem Chain objects from constants and provides
 * display-only helpers (chain name, explorer URL).
 */

import type { Chain } from "viem";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { getChain, SUPPORTED_CHAINS } from "@shinobi-cash/constants/chains";

export { getChain, SUPPORTED_CHAINS };

/**
 * Pool chain ID for easy reference
 */
export const POOL_CHAIN_ID = POOL_CHAIN.id;

/**
 * Get chain name from chain ID
 */
export const getChainName = (chainId: number | string | bigint): string => {
  const id = Number(chainId);
  const chain = SHINOBI_CASH_SUPPORTED_CHAINS.find((c) => c.id === id);
  return chain?.name ?? `Chain ${id}`;
};

/**
 * Get transaction explorer URL
 */
export const getTxExplorerUrl = (chainId: number | string | bigint, txHash: string): string => {
  const id = Number(chainId);
  const chain = SHINOBI_CASH_SUPPORTED_CHAINS.find((c) => c.id === id);
  const explorerUrl = chain?.blockExplorers?.default.url ?? "";
  return `${explorerUrl}/tx/${txHash}`;
};
