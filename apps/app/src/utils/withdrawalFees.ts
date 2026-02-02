import type { FeeQuote, WithdrawalRequest, Withdraw2Request, WithdrawalKind } from "@/types/withdrawal";
import {
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAWAL_CONFIG,
} from "@shinobi-cash/constants";
import { validateFeeQuote } from "@/utils/withdrawalInvariants";
import { pimlicoClient } from "@/lib/clients";

interface GasLimits {
  CALL_GAS_LIMIT: bigint;
  VERIFICATION_GAS_LIMIT: bigint;
  PRE_VERIFICATION_GAS: bigint;
  PAYMASTER_VERIFICATION_GAS_LIMIT: bigint;
  POST_OP_GAS_LIMIT: bigint;
}

interface FeeBreakdown {
  executionFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
}

/**
 * Classify a withdrawal as same-chain or cross-chain
 */
function classifyWithdrawal(
  destinationChainId: number | undefined,
  poolChainId: number
): WithdrawalKind {
  return destinationChainId && destinationChainId !== poolChainId ? "cross-chain" : "same-chain";
}

/**
 * Calculate fees from basis points
 */
function calculateFeesFromBPS(
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
 */
function calculateTotalGas(gasLimits: GasLimits): bigint {
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
 */
function calculateRelayFeeBPS(
  withdrawAmountWei: bigint,
  estimatedGasCostWei: bigint,
  maxBPS: number
): number {
  const calculatedBPS = Number((estimatedGasCostWei * BigInt(10000)) / withdrawAmountWei);
  return Math.min(Math.max(Math.ceil(calculatedBPS), 1), maxBPS);
}

/**
 * Get solver fee BPS based on withdrawal kind
 */
function calculateSolverFeeBPS(kind: WithdrawalKind, crossChainSolverFeeBPS = 500): number {
  return kind === "cross-chain" ? crossChainSolverFeeBPS : 0;
}

export async function quoteFees(
  request: WithdrawalRequest,
  poolChainId: number
): Promise<FeeQuote> {
  const kind = classifyWithdrawal(request.destinationChainId, poolChainId);

  const gasPriceData = await pimlicoClient.getUserOperationGasPrice();
  const gasPrice = {
    maxFeePerGas: gasPriceData.fast.maxFeePerGas,
    maxPriorityFeePerGas: gasPriceData.fast.maxPriorityFeePerGas,
  };

  const gasLimits = kind === "cross-chain" ? CROSS_CHAIN_GAS_LIMITS : SAME_CHAIN_GAS_LIMITS;
  const totalGas = calculateTotalGas(gasLimits);
  const estimatedGasCostWei = totalGas * gasPrice.maxFeePerGas;
  const relayFeeBPS = calculateRelayFeeBPS(
    request.withdrawAmountWei,
    estimatedGasCostWei,
    WITHDRAWAL_CONFIG.MAX_RELAY_FEE_BPS
  );
  const solverFeeBPS = calculateSolverFeeBPS(kind);

  const { executionFeeWei, solverFeeWei, totalFeeWei } = calculateFeesFromBPS(
    request.withdrawAmountWei,
    relayFeeBPS,
    solverFeeBPS
  );

  const netAmountWei =
    request.withdrawAmountWei > totalFeeWei ? request.withdrawAmountWei - totalFeeWei : BigInt(0);

  const feeQuote: FeeQuote = {
    kind,
    relayFeeBPS,
    solverFeeBPS,
    executionFeeWei,
    solverFeeWei,
    totalFeeWei,
    netAmountWei,
    gasPrice,
  };

  validateFeeQuote(feeQuote);
  return feeQuote;
}

export async function quoteWithdraw2Fees(
  request: Withdraw2Request,
  poolChainId: number
): Promise<FeeQuote> {
  const kind = classifyWithdrawal(request.destinationChainId, poolChainId);

  const gasPriceData = await pimlicoClient.getUserOperationGasPrice();
  const gasPrice = {
    maxFeePerGas: gasPriceData.fast.maxFeePerGas,
    maxPriorityFeePerGas: gasPriceData.fast.maxPriorityFeePerGas,
  };

  const gasLimits = kind === "cross-chain" ? CROSS_CHAIN_GAS_LIMITS : SAME_CHAIN_GAS_LIMITS;
  const totalGas = calculateTotalGas(gasLimits);
  const estimatedGasCostWei = totalGas * gasPrice.maxFeePerGas;
  const relayFeeBPS = calculateRelayFeeBPS(
    request.withdrawAmountWei,
    estimatedGasCostWei,
    WITHDRAWAL_CONFIG.MAX_RELAY_FEE_BPS
  );
  const solverFeeBPS = calculateSolverFeeBPS(kind);

  const { executionFeeWei, solverFeeWei, totalFeeWei } = calculateFeesFromBPS(
    request.withdrawAmountWei,
    relayFeeBPS,
    solverFeeBPS
  );

  const netAmountWei =
    request.withdrawAmountWei > totalFeeWei ? request.withdrawAmountWei - totalFeeWei : BigInt(0);

  const feeQuote: FeeQuote = {
    kind,
    relayFeeBPS,
    solverFeeBPS,
    executionFeeWei,
    solverFeeWei,
    totalFeeWei,
    netAmountWei,
    gasPrice,
  };

  validateFeeQuote(feeQuote);
  return feeQuote;
}
