/**
 * Chain Configuration
 *
 * Maps ShinobiChain metadata from constants to full viem Chain objects for
 * wagmi/viem operations (RPC, signing, etc). Display-only consumers should
 * use SHINOBI_CASH_SUPPORTED_CHAINS directly.
 */

import { arbitrumSepolia, baseSepolia, type Chain } from "viem/chains";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";

const VIEM_CHAINS: Record<number, Chain> = {
  [arbitrumSepolia.id]: arbitrumSepolia,
  [baseSepolia.id]: baseSepolia,
};

/**
 * Resolve a full viem Chain object from a chain ID.
 * Needed for createPublicClient, sendTransaction, WagmiAdapter, etc.
 */
export function getViemChain(chainId: number): Chain {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) throw new Error(`No viem chain for id ${chainId}`);
  return chain;
}

/**
 * All supported chains as viem Chain objects (for WagmiAdapter / wagmi config).
 */
export const VIEM_SUPPORTED_CHAINS: [Chain, ...Chain[]] = [
  getViemChain(POOL_CHAIN.id),
  ...SHINOBI_CASH_SUPPORTED_CHAINS.filter((c) => c.id !== POOL_CHAIN.id).map((c) => getViemChain(c.id)),
];

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
