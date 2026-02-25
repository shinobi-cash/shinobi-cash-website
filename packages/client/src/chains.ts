/**
 * Chain resolution for the client package.
 * Maps chain IDs to viem Chain objects for RPC clients.
 */

import { arbitrumSepolia, baseSepolia, type Chain } from "viem/chains";

const VIEM_CHAINS: Record<number, Chain> = {
  [arbitrumSepolia.id]: arbitrumSepolia,
  [baseSepolia.id]: baseSepolia,
};

export function getViemChain(chainId: number): Chain {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) throw new Error(`No viem chain for id ${chainId}`);
  return chain;
}
