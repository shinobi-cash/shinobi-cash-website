import type { FeeQuote, WithdrawalRequest, Withdraw2Request } from "@/types/withdrawal";
import {
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAW2_SAME_CHAIN_GAS_LIMITS,
  WITHDRAW2_CROSS_CHAIN_GAS_LIMITS,
  FEE_CONFIG,
} from "@shinobi-cash/constants";
import {
  classifyWithdrawal,
  calculateFeesFromBPS,
  calculateTotalGas,
  calculateRelayFeeBPS,
  calculateSolverFeeBPS,
} from "@shinobi-cash/core/fees";
import { validateFeeQuote } from "@shinobi-cash/core/validation";
import { pimlicoClient } from "@/lib/clients";

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
    FEE_CONFIG.MAX_RELAY_FEE_BPS
  );
  const solverFeeBPS = calculateSolverFeeBPS(kind, request.solverFeeBPS);

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

  // Use withdraw2-specific gas limits (higher due to 2-input proof verification)
  const gasLimits =
    kind === "cross-chain" ? WITHDRAW2_CROSS_CHAIN_GAS_LIMITS : WITHDRAW2_SAME_CHAIN_GAS_LIMITS;
  const totalGas = calculateTotalGas(gasLimits);
  const estimatedGasCostWei = totalGas * gasPrice.maxFeePerGas;
  const relayFeeBPS = calculateRelayFeeBPS(
    request.withdrawAmountWei,
    estimatedGasCostWei,
    FEE_CONFIG.MAX_RELAY_FEE_BPS
  );
  const solverFeeBPS = calculateSolverFeeBPS(kind, request.solverFeeBPS);

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
