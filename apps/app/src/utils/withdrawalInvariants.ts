import { WITHDRAWAL_CONFIG } from "@shinobi-cash/constants";
import type {
  WithdrawalPipelineContext,
  Withdraw2PipelineContext,
  FeeQuote,
  WithdrawalRequest,
  Withdraw2Request,
} from "@/types/withdrawal";

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

// ============ WITHDRAW2 (2:1) VALIDATION ============

export function validateWithdraw2Request(request: Withdraw2Request): void {
  if (request.withdrawAmountWei <= BigInt(0)) {
    throw new WithdrawalValidationError("Withdrawal amount must be positive", "INVALID_AMOUNT", {
      amount: request.withdrawAmountWei.toString(),
    });
  }

  const primaryAmount = BigInt(request.primaryNote.amount);
  const secondaryAmount = BigInt(request.secondaryNote.amount);
  const totalAmount = primaryAmount + secondaryAmount;

  if (request.withdrawAmountWei > totalAmount) {
    throw new WithdrawalValidationError(
      "Withdrawal amount exceeds combined note balance",
      "INSUFFICIENT_BALANCE",
      {
        withdrawAmount: request.withdrawAmountWei.toString(),
        primaryBalance: primaryAmount.toString(),
        secondaryBalance: secondaryAmount.toString(),
        totalBalance: totalAmount.toString(),
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

  // Validate that primary note has larger depositIndex
  if (request.primaryNote.depositIndex <= request.secondaryNote.depositIndex) {
    throw new WithdrawalValidationError(
      "Primary note must have larger depositIndex than secondary note",
      "INVALID_NOTE_ORDER",
      {
        primaryDepositIndex: request.primaryNote.depositIndex,
        secondaryDepositIndex: request.secondaryNote.depositIndex,
      }
    );
  }

  // Validate notes are from the same pool
  if (request.primaryNote.poolAddress !== request.secondaryNote.poolAddress) {
    throw new WithdrawalValidationError(
      "Both notes must be from the same pool",
      "POOL_MISMATCH",
      {
        primaryPool: request.primaryNote.poolAddress,
        secondaryPool: request.secondaryNote.poolAddress,
      }
    );
  }

  // Validate labelSelector
  if (request.labelSelector !== undefined && request.labelSelector !== 0 && request.labelSelector !== 1) {
    throw new WithdrawalValidationError("Label selector must be 0 or 1", "INVALID_LABEL_SELECTOR", {
      labelSelector: request.labelSelector,
    });
  }
}

export function validateWithdraw2Context(context: Withdraw2PipelineContext): void {
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
