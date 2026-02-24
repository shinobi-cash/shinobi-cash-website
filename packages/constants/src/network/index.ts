// ============ CHAIN CONFIGURATION ============

export type ShinobiChain = {
  readonly id: number;
  readonly name: string;
  readonly blockExplorers?: {
    readonly default: { readonly url: string };
  };
};

/**
 * Pool chain (Arbitrum Sepolia)
 * The main chain where the privacy pool contract is deployed
 */
export const POOL_CHAIN: ShinobiChain = {
  id: 421614,
  name: "Arbitrum Sepolia",
  blockExplorers: { default: { url: "https://sepolia.arbiscan.io" } },
};

/**
 * Base Sepolia chain definition
 */
export const BASE_SEPOLIA: ShinobiChain = {
  id: 84532,
  name: "Base Sepolia",
  blockExplorers: { default: { url: "https://sepolia.basescan.org" } },
};

/**
 * Supported crosschain networks
 * Chains that support cross-chain deposits and withdrawals
 */
export const SUPPORTED_CROSSCHAIN: ShinobiChain[] = [BASE_SEPOLIA];

/**
 * All supported Shinobi Cash chains
 */
export const SHINOBI_CASH_SUPPORTED_CHAINS = [POOL_CHAIN, ...SUPPORTED_CROSSCHAIN];
