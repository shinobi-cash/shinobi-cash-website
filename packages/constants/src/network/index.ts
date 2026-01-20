// ============ CHAIN CONFIGURATION ============

import { arbitrumSepolia, baseSepolia, Chain } from "viem/chains";

/**
 * Pool chain (Arbitrum Sepolia)
 * The main chain where the privacy pool contract is deployed
 */
export const POOL_CHAIN = arbitrumSepolia as Chain;

/**
 * Supported crosschain networks
 * Chains that support cross-chain deposits and withdrawals
 */
export const SUPPORTED_CROSSCHAIN: Chain[] = [baseSepolia];

/**
 * All supported Shinobi Cash chains
 */
export const SHINOBI_CASH_SUPPORTED_CHAINS = [POOL_CHAIN, ...SUPPORTED_CROSSCHAIN];