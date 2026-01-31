import {
  classifyWithdrawal,
  calculateFeesFromBPS,
  calculateTotalGas,
  calculateRelayFeeBPS,
  calculateSolverFeeBPS,
  type FeeQuote,
  type WithdrawalRequest,
} from "@shinobi-cash/core";
import {
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAWAL_CONFIG,
} from "@shinobi-cash/constants";
import { validateFeeQuote } from "@/utils/withdrawalInvariants";
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
