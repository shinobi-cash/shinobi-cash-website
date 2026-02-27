/**
 * Shared withdrawal utilities — used by both withdrawal and crosschain-withdrawal extensions.
 */

import type { WithdrawalFeeQuote } from "@shinobi-cash/core/fees";
import { calculateFeesFromBPS } from "@shinobi-cash/core/fees";

/** Build a WithdrawalFeeQuote from relay + solver BPS */
export function buildFeeQuote(amountWei: bigint, relayFeeBPS: number, solverFeeBPS: number): WithdrawalFeeQuote {
  const { executionFeeWei, solverFeeWei, totalFeeWei } = calculateFeesFromBPS(amountWei, relayFeeBPS, solverFeeBPS);
  const netAmountWei = amountWei > totalFeeWei ? amountWei - totalFeeWei : BigInt(0);
  return { relayFeeBPS, solverFeeBPS, executionFeeWei, solverFeeWei, totalFeeWei, netAmountWei };
}
