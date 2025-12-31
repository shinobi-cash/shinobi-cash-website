/**
 * Withdrawal Invariants
 *
 * Runtime assertions and validation logic to ensure withdrawal correctness.
 */

import type { WithdrawalRequest, FeeQuote, WithdrawalPipelineContext } from "./types";
import { WITHDRAWAL_CONFIG } from "../constants";

// ============ VALIDATION ERRORS ============

export class WithdrawalValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WithdrawalValidationError";
  }
}

// ============ INVARIANTS ============

/**
 * Validate withdrawal request
 *
 * @param request - Withdrawal request to validate
 * @throws WithdrawalValidationError if invalid
 */
export function validateWithdrawalRequest(request: WithdrawalRequest): void {
  // Amount must be positive
  if (request.withdrawAmountWei <= BigInt(0)) {
    throw new WithdrawalValidationError("Withdrawal amount must be positive", "INVALID_AMOUNT", {
      amount: request.withdrawAmountWei.toString(),
    });
  }

  // Amount must not exceed note balance
  const noteAmount = BigInt(request.note.amount);
  if (request.withdrawAmountWei > noteAmount) {
    throw new WithdrawalValidationError(
      "Withdrawal amount exceeds note balance",
      "INSUFFICIENT_BALANCE",
      {
        withdrawAmount: request.withdrawAmountWei.toString(),
        noteBalance: noteAmount.toString(),
      }
    );
  }

  // Recipient must be valid address
  if (!request.recipient || request.recipient.length !== 42) {
    throw new WithdrawalValidationError("Invalid recipient address", "INVALID_RECIPIENT", {
      recipient: request.recipient,
    });
  }

  // Cross-chain must have destination chain
  if (request.destinationChainId !== undefined && request.destinationChainId <= 0) {
    throw new WithdrawalValidationError("Invalid destination chain ID", "INVALID_CHAIN_ID", {
      chainId: request.destinationChainId,
    });
  }
}

/**
 * Validate fee quote
 *
 * @param feeQuote - Fee quote to validate
 * @throws WithdrawalValidationError if invalid
 */
export function validateFeeQuote(feeQuote: FeeQuote): void {
  // Relay fee must not exceed maximum
  if (feeQuote.relayFeeBPS > WITHDRAWAL_CONFIG.MAX_RELAY_FEE_BPS) {
    throw new WithdrawalValidationError("Relay fee exceeds maximum allowed", "FEE_TOO_HIGH", {
      relayFeeBPS: feeQuote.relayFeeBPS,
      maxBPS: WITHDRAWAL_CONFIG.MAX_RELAY_FEE_BPS,
    });
  }

  // Relay fee must be positive (zero not allowed by contract)
  if (feeQuote.relayFeeBPS <= 0) {
    throw new WithdrawalValidationError("Relay fee must be positive", "ZERO_FEE_NOT_ALLOWED", {
      relayFeeBPS: feeQuote.relayFeeBPS,
    });
  }

  // Net amount must be positive
  if (feeQuote.netAmountWei <= BigInt(0)) {
    throw new WithdrawalValidationError(
      "Net amount after fees must be positive",
      "INSUFFICIENT_AMOUNT_AFTER_FEES",
      {
        netAmount: feeQuote.netAmountWei.toString(),
        totalFees: feeQuote.totalFeeWei.toString(),
      }
    );
  }
}

/**
 * Validate withdrawal context
 *
 * @param context - Withdrawal context to validate
 * @throws WithdrawalValidationError if invalid
 */
export function validateWithdrawalContext(context: WithdrawalPipelineContext): void {
  // Pool scope must be positive
  if (context.poolScope <= BigInt(0)) {
    throw new WithdrawalValidationError("Invalid pool scope", "INVALID_POOL_SCOPE", {
      poolScope: context.poolScope.toString(),
    });
  }

  // Withdrawal data must be valid
  if (!context.withdrawalData || context.withdrawalData.length !== 2) {
    throw new WithdrawalValidationError(
      "Invalid withdrawal data structure",
      "INVALID_WITHDRAWAL_DATA",
      { withdrawalData: context.withdrawalData }
    );
  }
}

/**
 * Assert fee readiness - throw if fees are not ready
 *
 * @param isLoading - Whether fees are loading
 * @param error - Fee estimation error if any
 * @throws WithdrawalValidationError if fees not ready
 */
export function assertFeeReadiness(isLoading: boolean, error: string | null): void {
  if (isLoading) {
    throw new WithdrawalValidationError("Fee estimation is still loading", "FEES_NOT_READY", {
      isLoading,
    });
  }

  if (error) {
    throw new WithdrawalValidationError("Fee estimation failed", "FEE_ESTIMATION_FAILED", {
      error,
    });
  }
}
