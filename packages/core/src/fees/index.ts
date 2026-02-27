import {
  FEE_CONFIG,
  POOL_CHAIN,
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAW2_SAME_CHAIN_GAS_LIMITS,
  WITHDRAW2_CROSS_CHAIN_GAS_LIMITS,
} from "@shinobi-cash/constants";

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

// ============================================================================
// Fee Quotes (standalone, no account key needed)
// ============================================================================

export interface WithdrawalFeeQuote {
  relayFeeBPS: number;
  solverFeeBPS: number;
  executionFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
  netAmountWei: bigint;
}

export interface FeeQuoteParams {
  amountWei: bigint;
  destinationChainId?: number;
  gasPriceWei: bigint;
}

function computeFeeQuote(params: FeeQuoteParams, gasLimitsConfig: { sameChain: GasLimits; crossChain: GasLimits }): WithdrawalFeeQuote {
  const { amountWei, destinationChainId, gasPriceWei } = params;
  const kind = classifyWithdrawal(destinationChainId, POOL_CHAIN.id);

  const gasLimits = kind === "cross-chain" ? gasLimitsConfig.crossChain : gasLimitsConfig.sameChain;
  const totalGas = calculateTotalGas(gasLimits);
  const estimatedGasCostWei = totalGas * gasPriceWei;

  const relayFeeBPS = calculateRelayFeeBPS(amountWei, estimatedGasCostWei, FEE_CONFIG.MAX_RELAY_FEE_BPS);
  const solverFeeBPS = calculateSolverFeeBPS(kind);
  const { executionFeeWei, solverFeeWei, totalFeeWei } = calculateFeesFromBPS(amountWei, relayFeeBPS, solverFeeBPS);
  const netAmountWei = amountWei > totalFeeWei ? amountWei - totalFeeWei : 0n;

  return { relayFeeBPS, solverFeeBPS, executionFeeWei, solverFeeWei, totalFeeWei, netAmountWei };
}

/**
 * Quote fees for a 1:1 withdrawal.
 */
export function quoteWithdrawalFees(params: FeeQuoteParams): WithdrawalFeeQuote {
  return computeFeeQuote(params, {
    sameChain: SAME_CHAIN_GAS_LIMITS,
    crossChain: CROSS_CHAIN_GAS_LIMITS,
  });
}

/**
 * Quote fees for a 2:1 Withdraw2 merge.
 */
export function quoteWithdraw2Fees(params: FeeQuoteParams): WithdrawalFeeQuote {
  return computeFeeQuote(params, {
    sameChain: WITHDRAW2_SAME_CHAIN_GAS_LIMITS,
    crossChain: WITHDRAW2_CROSS_CHAIN_GAS_LIMITS,
  });
}

// ============================================================================
// Deposit Fee Quotes
// ============================================================================

export interface DepositFeeQuote {
  complianceFeeBPS: number;
  solverFeeBPS: number;
  complianceFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
  noteAmountWei: bigint;
}

/**
 * Quote fees for a deposit.
 * Fee order: solver fee deducted first (cross-chain), then compliance on remainder.
 */
export function quoteDepositFees(params: {
  amountWei: bigint;
  isCrossChain: boolean;
  solverFeeBPS?: number;
}): DepositFeeQuote {
  const { amountWei, isCrossChain } = params;
  const complianceFeeBPS = FEE_CONFIG.VETTING_FEE_BPS;
  const solverFeeBPS = isCrossChain ? (params.solverFeeBPS ?? FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS) : 0;

  const solverFeeWei = (amountWei * BigInt(solverFeeBPS)) / 10000n;
  const afterSolver = amountWei - solverFeeWei;
  const complianceFeeWei = (afterSolver * BigInt(complianceFeeBPS)) / 10000n;
  const totalFeeWei = solverFeeWei + complianceFeeWei;
  const noteAmountWei = amountWei - totalFeeWei;

  return { complianceFeeBPS, solverFeeBPS, complianceFeeWei, solverFeeWei, totalFeeWei, noteAmountWei };
}
