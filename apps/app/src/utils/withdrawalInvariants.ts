import { WITHDRAWAL_CONFIG } from "@shinobi-cash/constants";
import { WithdrawalPipelineContext } from "@/types/withdrawal";
import { type FeeQuote, type WithdrawalRequest } from "@shinobi-cash/core";

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

export function validateWithdrawalRequest(request: WithdrawalRequest): void {
  if (request.withdrawAmountWei <= BigInt(0)) {
    throw new WithdrawalValidationError("Withdrawal amount must be positive", "INVALID_AMOUNT", {
      amount: request.withdrawAmountWei.toString(),
    });
  }

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

  if (!request.recipient || request.recipient.length !== 42) {
    throw new WithdrawalValidationError("Invalid recipient address", "INVALID_RECIPIENT", {
      recipient: request.recipient,
    });
  }

  if (request.destinationChainId !== undefined && request.destinationChainId <= 0) {
    throw new WithdrawalValidationError("Invalid destination chain ID", "INVALID_CHAIN_ID", {
      chainId: request.destinationChainId,
    });
  }
}

export function validateFeeQuote(feeQuote: FeeQuote): void {
  if (feeQuote.relayFeeBPS > WITHDRAWAL_CONFIG.MAX_RELAY_FEE_BPS) {
    throw new WithdrawalValidationError("Relay fee exceeds maximum allowed", "FEE_TOO_HIGH", {
      relayFeeBPS: feeQuote.relayFeeBPS,
      maxBPS: WITHDRAWAL_CONFIG.MAX_RELAY_FEE_BPS,
    });
  }

  if (feeQuote.relayFeeBPS <= 0) {
    throw new WithdrawalValidationError("Relay fee must be positive", "ZERO_FEE_NOT_ALLOWED", {
      relayFeeBPS: feeQuote.relayFeeBPS,
    });
  }

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

export function validateWithdrawalContext(context: WithdrawalPipelineContext): void {
  if (context.poolScope <= BigInt(0)) {
    throw new WithdrawalValidationError("Invalid pool scope", "INVALID_POOL_SCOPE", {
      poolScope: context.poolScope.toString(),
    });
  }

  if (!context.withdrawalData || context.withdrawalData.length !== 2) {
    throw new WithdrawalValidationError(
      "Invalid withdrawal data structure",
      "INVALID_WITHDRAWAL_DATA",
      { withdrawalData: context.withdrawalData }
    );
  }
}
