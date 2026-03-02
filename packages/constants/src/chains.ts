import { defineChain } from "viem/utils";
import type { Chain } from "viem";
import { SHINOBI_CASH_SUPPORTED_CHAINS, POOL_CHAIN } from "./network/index.js";

const VIEM_CHAINS: Record<number, Chain> = Object.fromEntries(
  SHINOBI_CASH_SUPPORTED_CHAINS.map((c) => [
    c.id,
    defineChain({
      id: c.id,
      name: c.name,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [] } },
      blockExplorers: c.blockExplorers
        ? { default: { name: c.name, url: c.blockExplorers.default.url } }
        : undefined,
    }),
  ]),
);

export function getChain(chainId: number): Chain {
  const chain = VIEM_CHAINS[chainId];
  if (!chain) throw new Error(`No viem chain for id ${chainId}`);
  return chain;
}

export const SUPPORTED_CHAINS: [Chain, ...Chain[]] = [
  getChain(POOL_CHAIN.id),
  ...SHINOBI_CASH_SUPPORTED_CHAINS
    .filter((c) => c.id !== POOL_CHAIN.id)
    .map((c) => getChain(c.id)),
];
