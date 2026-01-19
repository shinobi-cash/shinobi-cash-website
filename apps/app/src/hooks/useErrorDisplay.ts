/**
 * useErrorDisplay - Centralized error display hook
 *
 * Consolidates error → toast logic with:
 * - Automatic deduplication (same error won't show twice)
 * - User-friendly message extraction
 * - Automatic reset when error clears
 * - User cancellation detection (no toast for cancellations)
 */

import { useEffect, useRef } from "react";
import { showToast } from "@/lib/toast";
import { type AppError, isUserCancellation, ErrorCode } from "@/lib/errors/errors";

/**
 * Error code to user-friendly message mapping
 * Centralizes all domain-specific error messages
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  // Deposit errors
  [ErrorCode.DEPOSIT.COMMITMENT_FAILED]: "Note generation failed. Please try again.",
  [ErrorCode.DEPOSIT.GAS_ESTIMATION_FAILED]: "Gas estimation failed. Please try again.",
  [ErrorCode.DEPOSIT.TRACKING_FAILED]: "Transaction tracking failed.",

  // Withdraw errors
  [ErrorCode.WITHDRAWAL.FEE_ESTIMATION_FAILED]: "Fee estimation failed. Please try again.",
  [ErrorCode.WITHDRAWAL.CONTEXT_FAILED]: "Failed to prepare withdrawal context.",
  [ErrorCode.WITHDRAWAL.WITNESS_FAILED]: "Failed to generate witness data.",
  [ErrorCode.WITHDRAWAL.PROOF_FAILED]: "Proof generation failed. Please try again.",
  [ErrorCode.WITHDRAWAL.CONFIRMATION_FAILED]: "Transaction confirmation failed.",

  // Common error (all categories use same code string)
  TRANSACTION_FAILED: "Transaction failed.",
};

interface UseErrorDisplayOptions {
  /** Action name for logging context (e.g., "Deposit", "Withdrawal") */
  action?: string;
  /** Toast duration in ms (default: 5000) */
  duration?: number;
}

/**
 * Hook to display controller errors as toasts
 *
 * @param error - AppError object or null
 * @param resetTrigger - Value that triggers deduplication reset (e.g., status === "idle")
 * @param options - Optional configuration
 *
 * @example
 * // In DepositForm
 * const error = state.state.status === "error" ? state.state.error : null;
 * const shouldReset = state.state.status === "idle";
 * useErrorDisplay(error, shouldReset, { action: "Deposit" });
 *
 * @example
 * // In WithdrawalForm
 * useErrorDisplay(state.lastError, state.state.status === "idle", { action: "Withdrawal" });
 */
export function useErrorDisplay(
  error: AppError | null,
  resetTrigger: boolean,
  options: UseErrorDisplayOptions = {}
) {
  const { action, duration = 5000 } = options;
  const shownErrorsRef = useRef(new Set<string>());

  // Show error toast when error appears
  useEffect(() => {
    if (!error) return;

    // Skip user cancellations
    if (isUserCancellation(error)) {
      return;
    }

    // Deduplicate: don't show same error twice
    const errorKey = `${error.category}:${error.code}:${error.message}`;
    if (shownErrorsRef.current.has(errorKey)) {
      return;
    }
    shownErrorsRef.current.add(errorKey);

    // Get user-friendly message
    const message = getErrorMessage(error);
    const displayMessage = action ? `${action}: ${message}` : message;

    showToast.error(displayMessage, { duration });
  }, [error, action, duration]);

  // Reset shown errors when trigger changes to true
  useEffect(() => {
    if (resetTrigger) {
      shownErrorsRef.current.clear();
    }
  }, [resetTrigger]);
}

/**
 * Get user-friendly message for an AppError
 */
function getErrorMessage(error: AppError): string {
  // Precondition errors are already user-facing
  if (
    error.code === ErrorCode.DEPOSIT.PRECONDITION ||
    error.code === ErrorCode.WITHDRAWAL.PRECONDITION
  ) {
    return error.message;
  }

  // Check for mapped message
  const mappedMessage = ERROR_CODE_MESSAGES[error.code];
  if (mappedMessage) {
    return mappedMessage;
  }

  // Fall back to error message
  return error.message || "An error occurred. Please try again.";
}
