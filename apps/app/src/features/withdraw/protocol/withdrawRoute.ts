/**
 * Withdrawal Route Protocol
 * Pure routing logic - no side effects, no UI dependencies
 */

import { POOL_CHAIN_ID } from "@/config/chains";
import {
  SHINOBI_CASH_ETH_POOL,
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
  WITHDRAWAL_FEES,
} from "@shinobi-cash/constants";

// ============ TYPES ============

export interface WithdrawRoute {
  poolAddress: `0x${string}`;
  paymasterAddress: `0x${string}`;
  isCrossChain: boolean;
  destinationChainId: number;
}

export interface WithdrawCallData {
  processooor: `0x${string}`;
  data: `0x${string}`;
}

// ============ ROUTING ============

/**
 * Resolve withdrawal route based on destination chain
 * Pure function - no side effects
 *
 * @param destinationChainId - Destination chain ID (undefined = same-chain)
 * @returns Withdrawal route configuration
 */
export function resolveWithdrawRoute(destinationChainId?: number): WithdrawRoute {
  const isCrossChain = destinationChainId !== undefined && destinationChainId !== POOL_CHAIN_ID;

  return {
    poolAddress: SHINOBI_CASH_ETH_POOL.address as `0x${string}`,
    paymasterAddress: isCrossChain
      ? (SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address as `0x${string}`)
      : (SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address as `0x${string}`),
    isCrossChain,
    destinationChainId: destinationChainId ?? POOL_CHAIN_ID,
  };
}

/**
 * Check if withdrawal to destination chain is supported
 * Explicit capability check - no exception abuse
 *
 * @param destinationChainId - Destination chain ID (undefined = same-chain)
 * @returns true if withdrawal is supported
 */
export function isWithdrawSupported(destinationChainId?: number): boolean {
  // Same-chain withdrawal always supported
  if (destinationChainId === undefined || destinationChainId === POOL_CHAIN_ID) {
    return true;
  }

  // Cross-chain: check if paymaster exists for destination chain
  // TODO: Add cross-chain validation when multi-chain support is added
  return true;
}

/**
 * Get default relay fee in basis points for route
 * Separated from routing logic for easier fee policy changes
 *
 * @param route - Withdrawal route
 * @returns Relay fee in basis points
 */
export function getDefaultRelayFeeBps(route: WithdrawRoute): number {
  // Currently using fixed fee, but this function allows
  // future fee policies based on route (e.g., different fees for cross-chain)
  return 500; // Using 500 BPS (5%) instead of DEFAULT_RELAY_FEE_BPS constant
}

/**
 * Get default solver fee in basis points for route
 * Only applicable to cross-chain withdrawals
 *
 * @param route - Withdrawal route
 * @returns Solver fee in basis points (0 for same-chain)
 */
export function getDefaultSolverFeeBps(route: WithdrawRoute): number {
  return route.isCrossChain ? Number(WITHDRAWAL_FEES.DEFAULT_SOLVER_FEE_BPS) : 0;
}
