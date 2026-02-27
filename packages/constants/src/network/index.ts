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
export const POOL_CHAIN = {
  id: 421614,
  name: "Arbitrum Sepolia",
  blockExplorers: { default: { url: "https://sepolia.arbiscan.io" } },
} as const satisfies ShinobiChain;

/**
 * Base Sepolia chain definition
 */
export const BASE_SEPOLIA = {
  id: 84532,
  name: "Base Sepolia",
  blockExplorers: { default: { url: "https://sepolia.basescan.org" } },
} as const satisfies ShinobiChain;

/**
 * Supported crosschain networks
 * Chains that support cross-chain deposits and withdrawals
 */
export const SUPPORTED_CROSSCHAIN = [BASE_SEPOLIA] as const;

/**
 * All supported Shinobi Cash chains
 */
export const SHINOBI_CASH_SUPPORTED_CHAINS = [POOL_CHAIN, ...SUPPORTED_CROSSCHAIN] as const;

/** Union of all supported chain IDs */
export type SupportedChainId = (typeof SHINOBI_CASH_SUPPORTED_CHAINS)[number]["id"];
