/**
 * Refund utility functions
 *
 * Helpers for checking refundability and determining refund parameters
 * for expired crosschain intents (both deposit and withdrawal).
 */

import { decodeFunctionData } from "viem";
import type { Intent, RawShinobiIntent } from "@shinobi-cash/data";

export type RefundType = "deposit" | "withdrawal";

/**
 * ABI for decoding refundCalldata (entrypoint.handleRefund)
 */
const HANDLE_REFUND_ABI = [
  {
    type: "function",
    name: "handleRefund",
    inputs: [
      { name: "_refundCommitmentHash", type: "uint256" },
      { name: "_feeRecipient", type: "address" },
      { name: "_refundFeeBPS", type: "uint256" },
      { name: "_scope", type: "uint256" },
    ],
  },
] as const;

/**
 * Check if an intent is eligible for refund.
 * An intent is refundable when it's escrowed and past its expiry time.
 */
export function isIntentRefundable(intent: Intent): boolean {
  if (intent.phase !== "ESCROWED") return false;
  const expiresMs = Number(intent.expires) * 1000;
  return Date.now() >= expiresMs;
}

/**
 * Get the refund type based on intent type.
 * - DEPOSIT intents: refund on origin chain (direct wallet call)
 * - WITHDRAWAL intents: refund on pool chain (UserOperation via paymaster)
 */
export function getRefundType(intent: Intent): RefundType {
  return intent.intentType === "DEPOSIT" ? "deposit" : "withdrawal";
}

/**
 * Get the chain ID where the refund transaction must be executed.
 * - Deposit refund: origin chain (where funds are escrowed in deposit InputSettler)
 * - Withdrawal refund: pool chain (where funds are escrowed in withdrawal InputSettler)
 */
export function getRefundChainId(intent: Intent, poolChainId: number): number {
  if (intent.intentType === "DEPOSIT") {
    return Number(intent.originChainId);
  }
  // Withdrawal intents are escrowed on the pool chain
  return poolChainId;
}

/**
 * Get time remaining until refund becomes available (in milliseconds).
 * Returns 0 if already refundable.
 */
export function getTimeUntilRefundable(intent: Intent): number {
  const expiresMs = Number(intent.expires) * 1000;
  return Math.max(0, expiresMs - Date.now());
}

/**
 * Extract the refund fee BPS from a withdrawal intent's refundCalldata.
 * The refundCalldata encodes a call to handleRefund(uint256, address, uint256, uint256)
 * where the 3rd parameter is refundFeeBPS.
 *
 * Returns null for deposit intents (no refund fee) or if decoding fails.
 */
export function getRefundFeeBps(rawIntent: RawShinobiIntent | undefined): number | null {
  if (!rawIntent?.refundCalldata || rawIntent.refundCalldata === "0x") return null;

  try {
    const decoded = decodeFunctionData({
      abi: HANDLE_REFUND_ABI,
      data: rawIntent.refundCalldata as `0x${string}`,
    });
    if (!decoded.args) return null;
    return Number(decoded.args[2]);
  } catch {
    return null;
  }
}
