/**
 * Withdrawal Pipeline Functions
 *
 * Pure functions that transition between pipeline stages.
 * Each function takes an artifact from the previous stage and produces the next.
 */

import type { WithdrawalRequest, WithdrawalKind, FeeQuote } from "./types";
import type { WithdrawStatus } from "../types/withdrawStatus";
import type { Note } from "@shinobi-cash/core";
import { formatEther } from "viem";

// ============ STAGE TRANSITIONS ============

/**
 * Classify withdrawal type based on destination chain
 *
 * @param request - Withdrawal request
 * @param poolChainId - Current pool chain ID
 * @returns Withdrawal classification
 */
export function classifyWithdrawal(
  request: WithdrawalRequest,
  poolChainId: number
): WithdrawalKind {
  return request.destinationChainId && request.destinationChainId !== poolChainId
    ? "cross-chain"
    : "same-chain";
}

/**
 * Calculate net amount after fees
 *
 * @param withdrawAmount - Amount to withdraw in wei
 * @param feeQuote - Fee quote with all fees
 * @returns Net amount user will receive
 */
export function calculateNetAmount(
  withdrawAmountWei: bigint,
  feeQuote: FeeQuote
): bigint {
  const totalFees = feeQuote.executionFeeWei + feeQuote.solverFeeWei;
  return withdrawAmountWei > totalFees ? withdrawAmountWei - totalFees : BigInt(0);
}

/**
 * Calculate total fees from BPS values
 *
 * @param withdrawAmount - Amount to withdraw in wei
 * @param relayFeeBPS - Relay fee in basis points
 * @param solverFeeBPS - Solver fee in basis points
 * @returns Total fees in wei
 */
export function calculateFeesFromBPS(
  withdrawAmountWei: bigint,
  relayFeeBPS: number,
  solverFeeBPS: number
): {
  executionFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
} {
  const executionFeeWei = (withdrawAmountWei * BigInt(relayFeeBPS)) / BigInt(10000);
  const solverFeeWei = (withdrawAmountWei * BigInt(solverFeeBPS)) / BigInt(10000);
  const totalFeeWei = executionFeeWei + solverFeeWei;

  return { executionFeeWei, solverFeeWei, totalFeeWei };
}

/**
 * Format fee quote for display
 *
 * @param feeQuote - Fee quote
 * @returns Human-readable fee breakdown
 */
export function formatFeeQuote(feeQuote: FeeQuote): {
  executionFeeEth: string;
  solverFeeEth: string;
  totalFeeEth: string;
  netAmountEth: string;
} {
  return {
    executionFeeEth: formatEther(feeQuote.executionFeeWei),
    solverFeeEth: formatEther(feeQuote.solverFeeWei),
    totalFeeEth: formatEther(feeQuote.totalFeeWei),
    netAmountEth: formatEther(feeQuote.netAmountWei),
  };
}

// ============ STATUS DERIVATION ============

/**
 * Derive withdrawal status from current state
 *
 * Pure function that determines the withdrawal status based on engine,
 * form, and note selection state. Testable in isolation.
 *
 * @param input - Current state snapshot
 * @returns Current withdrawal status
 */
export function deriveWithdrawStatus(input: {
  hasExecutionResult: boolean;
  isExecuting: boolean;
  hasEngineError: boolean;
  isPreparing: boolean;
  selectedNote: Note | null;
  amountError: string | null;
  addressError: string | null;
  amount: string;
  recipientAddress: string;
}): WithdrawStatus {
  // Priority order (highest to lowest):
  // 1. Execution complete
  if (input.hasExecutionResult) return "submitted";

  // 2. Currently executing
  if (input.isExecuting) return "submitting";

  // 3. Proof generation failed
  if (input.hasEngineError) return "proof-failed";

  // 4. Currently preparing proof
  if (input.isPreparing) return "preparing-proof";

  // 5. No note selected
  if (!input.selectedNote) return "no-note-selected";

  // 6. Form validation errors
  if (input.amountError) return "invalid-amount";
  if (input.addressError) return "invalid-address";

  // 7. Ready to withdraw
  if (input.amount.trim() !== "" && input.recipientAddress.trim() !== "") {
    return "ready";
  }

  // 8. Default idle state
  return "idle";
}
