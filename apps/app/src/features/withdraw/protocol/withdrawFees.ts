/**
 * Withdrawal Fee Protocol
 * Pure fee calculations for display purposes
 *
 * ⚠️ WARNING: Uses floating point math - FOR DISPLAY ONLY
 * DO NOT use for on-chain logic or transaction building
 */

import type { WithdrawRoute } from "./withdrawRoute";
import { getDefaultRelayFeeBps, getDefaultSolverFeeBps } from "./withdrawRoute";

// ============ FEE CALCULATIONS ============

/**
 * Calculate execution fee (relay fee)
 * Maximum fee taken from withdrawal amount for network gas
 *
 * ⚠️ DISPLAY ONLY - floating point precision acceptable for UI
 *
 * @param withdrawAmount - Amount being withdrawn (as number)
 * @param relayFeeBps - Relay fee in basis points
 * @returns Execution fee amount
 */
export function calculateExecutionFee(withdrawAmount: number, relayFeeBps: number): number {
  return (withdrawAmount * relayFeeBps) / 10000;
}

/**
 * Calculate solver fee
 * Only applies to cross-chain withdrawals
 *
 * ⚠️ DISPLAY ONLY - floating point precision acceptable for UI
 *
 * @param withdrawAmount - Amount being withdrawn (as number)
 * @param solverFeeBps - Solver fee in basis points
 * @returns Solver fee amount (0 for same-chain)
 */
export function calculateSolverFee(withdrawAmount: number, solverFeeBps: number): number {
  return (withdrawAmount * solverFeeBps) / 10000;
}

/**
 * Calculate final amount user receives after fees
 *
 * ⚠️ DISPLAY ONLY - floating point precision acceptable for UI
 *
 * @param withdrawAmount - Amount being withdrawn
 * @param executionFee - Execution fee amount
 * @param solverFee - Solver fee amount (0 for same-chain)
 * @returns Amount user receives
 */
export function calculateReceiveAmount(
  withdrawAmount: number,
  executionFee: number,
  solverFee: number
): number {
  return withdrawAmount - executionFee - solverFee;
}

// ============ COMPREHENSIVE FEE BREAKDOWN ============

export interface WithdrawFeeBreakdown {
  withdrawAmount: number;
  executionFee: number;
  solverFee: number;
  youReceive: number;
  relayFeeBps: number;
  solverFeeBps: number;
  isCrossChain: boolean;
}

/**
 * Calculate complete fee breakdown for display
 * FOR DISPLAY ONLY
 *
 * ⚠️ Uses floating point math - DO NOT use for on-chain logic
 *
 * @param amount - Withdrawal amount string
 * @param route - Withdrawal route
 * @returns Complete fee breakdown for UI display
 */
export function formatWithdrawAmountsForDisplay(
  amount: string,
  route: WithdrawRoute
): WithdrawFeeBreakdown {
  // DISPLAY ONLY - floating point precision acceptable for UI
  const withdrawAmount = parseFloat(amount) || 0;
  const relayFeeBps = getDefaultRelayFeeBps(route);
  const solverFeeBps = getDefaultSolverFeeBps(route);

  const executionFee = calculateExecutionFee(withdrawAmount, relayFeeBps);
  const solverFee = calculateSolverFee(withdrawAmount, solverFeeBps);
  const youReceive = calculateReceiveAmount(withdrawAmount, executionFee, solverFee);

  return {
    withdrawAmount,
    executionFee,
    solverFee,
    youReceive,
    relayFeeBps,
    solverFeeBps,
    isCrossChain: route.isCrossChain,
  };
}
