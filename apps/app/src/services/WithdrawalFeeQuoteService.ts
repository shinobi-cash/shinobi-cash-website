/**
 * Fee Quote Service
 *
 * Calculates withdrawal fees based on gas prices and withdrawal type.
 */

import type { WithdrawalRequest, FeeQuote, WithdrawalKind } from "@/types/withdrawal";
import { classifyWithdrawal, calculateFeesFromBPS } from "@/utils/withdrawalPipeline";
import { validateFeeQuote } from "@/utils/withdrawalInvariants";
import { pimlicoClient } from "@/lib/clients";
import { SAME_CHAIN_GAS_LIMITS, CROSS_CHAIN_GAS_LIMITS, WITHDRAWAL_CONFIG  } from "@/constants/withdraw";

// ============ GAS ESTIMATION ============

/**
 * Calculate total gas required for withdrawal
 */
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

/**
 * Calculate relay fee BPS based on gas cost
 */
function calculateRelayFeeBPS(withdrawAmountWei: bigint, estimatedGasCostWei: bigint): number {
  const maxBPS = WITHDRAWAL_CONFIG.MAX_RELAY_FEE_BPS;

  // Formula: BPS = (gasCost / withdrawAmount) * 10000
  const calculatedBPS = Number((estimatedGasCostWei * BigInt(10000)) / withdrawAmountWei);

  // Cap at maxRelayFeeBPS and ensure it's at least 1
  const actualBPS = Math.min(Math.max(Math.ceil(calculatedBPS), 1), maxBPS);

  return actualBPS;
}

/**
 * Calculate solver fee BPS for cross-chain withdrawals
 */
function calculateSolverFeeBPS(kind: WithdrawalKind): number {
  // Fixed 5% solver fee for cross-chain
  return kind === "cross-chain" ? 500 : 0;
}

// ============ PUBLIC API ============

/**
 * Generate fee quote for withdrawal
 *
 * @param request - Withdrawal request
 * @param poolChainId - Pool chain ID for classification
 * @returns Fee quote with all calculated fees
 */
export async function quoteFees(
  request: WithdrawalRequest,
  poolChainId: number
): Promise<FeeQuote> {
  // 1. Classify withdrawal type
  const kind = classifyWithdrawal(request, poolChainId);

  // 2. Fetch current gas price
  const gasPriceData = await pimlicoClient.getUserOperationGasPrice();
  const gasPrice = {
    maxFeePerGas: gasPriceData.fast.maxFeePerGas,
    maxPriorityFeePerGas: gasPriceData.fast.maxPriorityFeePerGas,
  };

  // 3. Calculate total gas and cost
  const totalGas = calculateTotalGas(kind);
  const estimatedGasCostWei = totalGas * gasPrice.maxFeePerGas;

  // 4. Calculate relay fee BPS
  const relayFeeBPS = calculateRelayFeeBPS(request.withdrawAmountWei, estimatedGasCostWei);

  // 5. Calculate solver fee BPS
  const solverFeeBPS = calculateSolverFeeBPS(kind);

  // 6. Calculate fees in wei
  const { executionFeeWei, solverFeeWei, totalFeeWei } = calculateFeesFromBPS(
    request.withdrawAmountWei,
    relayFeeBPS,
    solverFeeBPS
  );

  // 7. Calculate net amount
  const netAmountWei =
    request.withdrawAmountWei > totalFeeWei ? request.withdrawAmountWei - totalFeeWei : BigInt(0);

  // 8. Create fee quote
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

  // 9. Validate before returning
  validateFeeQuote(feeQuote);

  return feeQuote;
}
