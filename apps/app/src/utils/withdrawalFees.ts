import type { WithdrawalRequest, FeeQuote, WithdrawalKind } from "@/types/withdrawal";
import { classifyWithdrawal, calculateFeesFromBPS } from "@/utils/withdrawalPipeline";
import { validateFeeQuote } from "@/utils/withdrawalInvariants";
import { pimlicoClient } from "@/lib/clients";
import {
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAWAL_CONFIG,
} from "@/constants/withdraw";

function calculateTotalGas(kind: WithdrawalKind): bigint {
  const gasLimits = kind === "cross-chain" ? CROSS_CHAIN_GAS_LIMITS : SAME_CHAIN_GAS_LIMITS;
  return (
    gasLimits.CALL_GAS_LIMIT +
    gasLimits.VERIFICATION_GAS_LIMIT +
    gasLimits.PRE_VERIFICATION_GAS +
    gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT +
    gasLimits.POST_OP_GAS_LIMIT
  );
}

function calculateRelayFeeBPS(withdrawAmountWei: bigint, estimatedGasCostWei: bigint): number {
  const maxBPS = WITHDRAWAL_CONFIG.MAX_RELAY_FEE_BPS;
  const calculatedBPS = Number((estimatedGasCostWei * BigInt(10000)) / withdrawAmountWei);
  return Math.min(Math.max(Math.ceil(calculatedBPS), 1), maxBPS);
}

function calculateSolverFeeBPS(kind: WithdrawalKind): number {
  return kind === "cross-chain" ? 500 : 0;
}

export async function quoteFees(
  request: WithdrawalRequest,
  poolChainId: number
): Promise<FeeQuote> {
  const kind = classifyWithdrawal(request, poolChainId);

  const gasPriceData = await pimlicoClient.getUserOperationGasPrice();
  const gasPrice = {
    maxFeePerGas: gasPriceData.fast.maxFeePerGas,
    maxPriorityFeePerGas: gasPriceData.fast.maxPriorityFeePerGas,
  };

  const totalGas = calculateTotalGas(kind);
  const estimatedGasCostWei = totalGas * gasPrice.maxFeePerGas;
  const relayFeeBPS = calculateRelayFeeBPS(request.withdrawAmountWei, estimatedGasCostWei);
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
