import { FEE_CONFIG } from "@shinobi-cash/constants";

export type WithdrawalKind = "same-chain" | "cross-chain";

export interface GasLimits {
  CALL_GAS_LIMIT: bigint;
  VERIFICATION_GAS_LIMIT: bigint;
  PRE_VERIFICATION_GAS: bigint;
  PAYMASTER_VERIFICATION_GAS_LIMIT: bigint;
  POST_OP_GAS_LIMIT: bigint;
}

export interface FeeBreakdown {
  executionFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
}

/**
 * Classify a withdrawal as same-chain or cross-chain.
 */
export function classifyWithdrawal(
  destinationChainId: number | undefined,
  poolChainId: number
): WithdrawalKind {
  return destinationChainId && destinationChainId !== poolChainId
    ? "cross-chain"
    : "same-chain";
}

/**
 * Calculate fees from basis points.
 */
export function calculateFeesFromBPS(
  withdrawAmountWei: bigint,
  relayFeeBPS: number,
  solverFeeBPS: number
): FeeBreakdown {
  const executionFeeWei =
    (withdrawAmountWei * BigInt(relayFeeBPS)) / BigInt(10000);
  const solverFeeWei =
    (withdrawAmountWei * BigInt(solverFeeBPS)) / BigInt(10000);
  const totalFeeWei = executionFeeWei + solverFeeWei;

  return { executionFeeWei, solverFeeWei, totalFeeWei };
}

/**
 * Calculate total gas for a withdrawal UserOperation.
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
 * Buffer multiplier for gas price fluctuations between quote and execution.
 * 2% buffer ensures the fee covers gas even if prices increase slightly.
 */
const GAS_PRICE_BUFFER = 1.02;

/**
 * Calculate relay fee BPS from gas cost and withdrawal amount.
 * Includes a small buffer to account for gas price fluctuations.
 */
export function calculateRelayFeeBPS(
  withdrawAmountWei: bigint,
  estimatedGasCostWei: bigint,
  maxBPS: number
): number {
  const calculatedBPS = Number(
    (estimatedGasCostWei * BigInt(10000)) / withdrawAmountWei
  );
  const bufferedBPS = Math.ceil(calculatedBPS * GAS_PRICE_BUFFER);
  return Math.min(Math.max(bufferedBPS, 1), maxBPS);
}

/**
 * Get solver fee BPS based on withdrawal kind.
 */
export function calculateSolverFeeBPS(
  kind: WithdrawalKind,
  crossChainSolverFeeBPS: number = FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS
): number {
  return kind === "cross-chain" ? crossChainSolverFeeBPS : 0;
}
