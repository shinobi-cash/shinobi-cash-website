/**
 * Withdrawal Utility Functions
 *
 * Pure functions for withdrawal classification and fee calculations.
 * These are framework-agnostic and can be used by any app.
 */

import type { WithdrawalKind } from '../types/Withdrawal.js';

/**
 * Gas limit configuration for UserOperations
 */
export interface GasLimits {
  CALL_GAS_LIMIT: bigint;
  VERIFICATION_GAS_LIMIT: bigint;
  PRE_VERIFICATION_GAS: bigint;
  PAYMASTER_VERIFICATION_GAS_LIMIT: bigint;
  POST_OP_GAS_LIMIT: bigint;
}

/**
 * Fee breakdown from basis points calculation
 */
export interface FeeBreakdown {
  executionFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
}

/**
 * Classify a withdrawal as same-chain or cross-chain
 *
 * @param destinationChainId - Target chain for withdrawal (undefined = same-chain)
 * @param poolChainId - Chain where the privacy pool is deployed
 * @returns Withdrawal classification
 */
export function classifyWithdrawal(
  destinationChainId: number | undefined,
  poolChainId: number
): WithdrawalKind {
  return destinationChainId && destinationChainId !== poolChainId
    ? 'cross-chain'
    : 'same-chain';
}

/**
 * Calculate fees from basis points
 *
 * @param withdrawAmountWei - Amount being withdrawn in wei
 * @param relayFeeBPS - Relay fee in basis points (1 BPS = 0.01%)
 * @param solverFeeBPS - Solver fee in basis points (0 for same-chain)
 * @returns Fee breakdown in wei
 */
export function calculateFeesFromBPS(
  withdrawAmountWei: bigint,
  relayFeeBPS: number,
  solverFeeBPS: number
): FeeBreakdown {
  const executionFeeWei = (withdrawAmountWei * BigInt(relayFeeBPS)) / BigInt(10000);
  const solverFeeWei = (withdrawAmountWei * BigInt(solverFeeBPS)) / BigInt(10000);
  const totalFeeWei = executionFeeWei + solverFeeWei;

  return { executionFeeWei, solverFeeWei, totalFeeWei };
}

/**
 * Calculate total gas for a withdrawal UserOperation
 *
 * @param gasLimits - Gas limit configuration
 * @returns Total gas units
 */
export function calculateTotalGas(gasLimits: GasLimits): bigint {
  return (
    gasLimits.CALL_GAS_LIMIT +
    gasLimits.VERIFICATION_GAS_LIMIT +
    gasLimits.PRE_VERIFICATION_GAS +
    gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT +
    gasLimits.POST_OP_GAS_LIMIT
  );
}

/**
 * Calculate relay fee BPS from gas cost and withdrawal amount
 *
 * @param withdrawAmountWei - Amount being withdrawn in wei
 * @param estimatedGasCostWei - Estimated gas cost in wei
 * @param maxBPS - Maximum allowed BPS (cap)
 * @returns Relay fee in basis points
 */
export function calculateRelayFeeBPS(
  withdrawAmountWei: bigint,
  estimatedGasCostWei: bigint,
  maxBPS: number
): number {
  const calculatedBPS = Number((estimatedGasCostWei * BigInt(10000)) / withdrawAmountWei);
  return Math.min(Math.max(Math.ceil(calculatedBPS), 1), maxBPS);
}

/**
 * Get solver fee BPS based on withdrawal kind
 *
 * @param kind - Withdrawal classification
 * @param crossChainSolverFeeBPS - Solver fee for cross-chain (default 500 = 5%)
 * @returns Solver fee in basis points
 */
export function calculateSolverFeeBPS(
  kind: WithdrawalKind,
  crossChainSolverFeeBPS = 500
): number {
  return kind === 'cross-chain' ? crossChainSolverFeeBPS : 0;
}
