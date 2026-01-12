/**
 * Withdrawal Pipeline Functions
 *
 * Pure functions that transition between pipeline stages.
 * Each function takes an artifact from the previous stage and produces the next.
 */

import type { WithdrawalRequest, WithdrawalKind } from "./types";

// ============ STAGE TRANSITIONS ============

/**
 * Classify withdrawal type based on destination chain
 *
 * @param request - Withdrawal request
 * @param poolChainId - Current pool chain ID
 * @returns Withdrawal classification
 */
export function classifyWithdrawal(
  request: WithdrawalRequest,
  poolChainId: number
): WithdrawalKind {
  return request.destinationChainId && request.destinationChainId !== poolChainId
    ? "cross-chain"
    : "same-chain";
}

/**
 * Calculate total fees from BPS values
 *
 * @param withdrawAmount - Amount to withdraw in wei
 * @param relayFeeBPS - Relay fee in basis points
 * @param solverFeeBPS - Solver fee in basis points
 * @returns Total fees in wei
 */
export function calculateFeesFromBPS(
  withdrawAmountWei: bigint,
  relayFeeBPS: number,
  solverFeeBPS: number
): {
  executionFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
} {
  const executionFeeWei = (withdrawAmountWei * BigInt(relayFeeBPS)) / BigInt(10000);
  const solverFeeWei = (withdrawAmountWei * BigInt(solverFeeBPS)) / BigInt(10000);
  const totalFeeWei = executionFeeWei + solverFeeWei;

  return { executionFeeWei, solverFeeWei, totalFeeWei };
}
