import { FEE_CONFIG } from "@shinobi-cash/constants";

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

// Minimal interfaces — the app's full types structurally satisfy these.

interface ValidatableNote {
  amount: string | bigint;
  depositIndex: number;
  poolAddress: string;
}

interface ValidatableWithdrawalRequest {
  withdrawAmountWei: bigint;
  note: ValidatableNote;
  recipient: string;
  destinationChainId?: number;
}

interface ValidatableFeeQuote {
  relayFeeBPS: number;
  netAmountWei: bigint;
  totalFeeWei: bigint;
}

interface ValidatablePipelineContext {
  poolScope: bigint;
  withdrawalData: readonly [`0x${string}`, `0x${string}`] | unknown[];
}

interface ValidatableWithdraw2Request {
  withdrawAmountWei: bigint;
  primaryNote: ValidatableNote;
  secondaryNote: ValidatableNote;
  recipient: string;
  destinationChainId?: number;
  labelSelector?: number;
}

export function validateWithdrawalRequest(
  request: ValidatableWithdrawalRequest
): void {
  if (request.withdrawAmountWei <= BigInt(0)) {
    throw new WithdrawalValidationError(
      "Withdrawal amount must be positive",
      "INVALID_AMOUNT",
      { amount: request.withdrawAmountWei.toString() }
    );
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
    throw new WithdrawalValidationError(
      "Invalid recipient address",
      "INVALID_RECIPIENT",
      { recipient: request.recipient }
    );
  }

  if (
    request.destinationChainId !== undefined &&
    request.destinationChainId <= 0
  ) {
    throw new WithdrawalValidationError(
      "Invalid destination chain ID",
      "INVALID_CHAIN_ID",
      { chainId: request.destinationChainId }
    );
  }
}

export function validateFeeQuote(feeQuote: ValidatableFeeQuote): void {
  if (feeQuote.relayFeeBPS > FEE_CONFIG.MAX_RELAY_FEE_BPS) {
    throw new WithdrawalValidationError(
      "Relay fee exceeds maximum allowed",
      "FEE_TOO_HIGH",
      {
        relayFeeBPS: feeQuote.relayFeeBPS,
        maxBPS: FEE_CONFIG.MAX_RELAY_FEE_BPS,
      }
    );
  }

  if (feeQuote.relayFeeBPS <= 0) {
    throw new WithdrawalValidationError(
      "Relay fee must be positive",
      "ZERO_FEE_NOT_ALLOWED",
      { relayFeeBPS: feeQuote.relayFeeBPS }
    );
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

export function validateWithdrawalContext(
  context: ValidatablePipelineContext
): void {
  if (context.poolScope <= BigInt(0)) {
    throw new WithdrawalValidationError(
      "Invalid pool scope",
      "INVALID_POOL_SCOPE",
      { poolScope: context.poolScope.toString() }
    );
  }

  if (!context.withdrawalData || context.withdrawalData.length !== 2) {
    throw new WithdrawalValidationError(
      "Invalid withdrawal data structure",
      "INVALID_WITHDRAWAL_DATA",
      { withdrawalData: context.withdrawalData }
    );
  }
}

export function validateWithdraw2Request(
  request: ValidatableWithdraw2Request
): void {
  if (request.withdrawAmountWei <= BigInt(0)) {
    throw new WithdrawalValidationError(
      "Withdrawal amount must be positive",
      "INVALID_AMOUNT",
      { amount: request.withdrawAmountWei.toString() }
    );
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
    throw new WithdrawalValidationError(
      "Invalid recipient address",
      "INVALID_RECIPIENT",
      { recipient: request.recipient }
    );
  }

  if (
    request.destinationChainId !== undefined &&
    request.destinationChainId <= 0
  ) {
    throw new WithdrawalValidationError(
      "Invalid destination chain ID",
      "INVALID_CHAIN_ID",
      { chainId: request.destinationChainId }
    );
  }

  if (
    request.primaryNote.depositIndex <= request.secondaryNote.depositIndex
  ) {
    throw new WithdrawalValidationError(
      "Primary note must have larger depositIndex than secondary note",
      "INVALID_NOTE_ORDER",
      {
        primaryDepositIndex: request.primaryNote.depositIndex,
        secondaryDepositIndex: request.secondaryNote.depositIndex,
      }
    );
  }

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

  if (
    request.labelSelector !== undefined &&
    request.labelSelector !== 0 &&
    request.labelSelector !== 1
  ) {
    throw new WithdrawalValidationError(
      "Label selector must be 0 or 1",
      "INVALID_LABEL_SELECTOR",
      { labelSelector: request.labelSelector }
    );
  }
}

export function validateWithdraw2Context(
  context: ValidatablePipelineContext
): void {
  if (context.poolScope <= BigInt(0)) {
    throw new WithdrawalValidationError(
      "Invalid pool scope",
      "INVALID_POOL_SCOPE",
      { poolScope: context.poolScope.toString() }
    );
  }

  if (!context.withdrawalData || context.withdrawalData.length !== 2) {
    throw new WithdrawalValidationError(
      "Invalid withdrawal data structure",
      "INVALID_WITHDRAWAL_DATA",
      { withdrawalData: context.withdrawalData }
    );
  }
}
