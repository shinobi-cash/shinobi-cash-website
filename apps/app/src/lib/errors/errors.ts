export type ErrorCategory =
  | "AUTH"
  | "BLOCKCHAIN"
  | "NETWORK"
  | "INDEXER"
  | "DEPOSIT"
  | "WITHDRAWAL";

export const ErrorCode = {
  AUTH: {
    CANCELLED: "CANCELLED",
    FAILED: "FAILED",
    PASSKEY_FAILED: "PASSKEY_FAILED",
    PASSKEY_UNSUPPORTED: "PASSKEY_UNSUPPORTED",
    ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
    DECRYPTION_FAILED: "DECRYPTION_FAILED",
  },
  BLOCKCHAIN: {
    USER_REJECTED: "USER_REJECTED",
    INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
    TRANSACTION_FAILED: "TRANSACTION_FAILED",
    TRANSACTION_REVERTED: "TRANSACTION_REVERTED",
    CONTRACT_ERROR: "CONTRACT_ERROR",
    RPC_ERROR: "RPC_ERROR",
    TIMEOUT: "TIMEOUT",
  },
  NETWORK: {
    REQUEST_FAILED: "REQUEST_FAILED",
    TIMEOUT: "TIMEOUT",
    OFFLINE: "OFFLINE",
  },
  INDEXER: {
    FETCH_FAILED: "FETCH_FAILED",
    INVALID_RESPONSE: "INVALID_RESPONSE",
    UNAVAILABLE: "UNAVAILABLE",
  },
  DEPOSIT: {
    PRECONDITION: "PRECONDITION",
    COMMITMENT_FAILED: "COMMITMENT_FAILED",
    GAS_ESTIMATION_FAILED: "GAS_ESTIMATION_FAILED",
    TRANSACTION_FAILED: "TRANSACTION_FAILED",
    TRACKING_FAILED: "TRACKING_FAILED",
  },
  WITHDRAWAL: {
    PRECONDITION: "PRECONDITION",
    FEE_ESTIMATION_FAILED: "FEE_ESTIMATION_FAILED",
    CONTEXT_FAILED: "CONTEXT_FAILED",
    WITNESS_FAILED: "WITNESS_FAILED",
    PROOF_FAILED: "PROOF_FAILED",
    TRANSACTION_FAILED: "TRANSACTION_FAILED",
    CONFIRMATION_FAILED: "CONFIRMATION_FAILED",
    INVALID_AMOUNT: "INVALID_AMOUNT",
    INVALID_RECIPIENT: "INVALID_RECIPIENT",
    INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  },
} as const;

export interface AppError {
  category: ErrorCategory;
  code: string;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export class AppException extends Error implements AppError {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly context?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(error: AppError) {
    super(error.message);
    this.name = "AppException";
    this.category = error.category;
    this.code = error.code;
    this.cause = error.cause;
    this.context = error.context;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): AppError {
    return {
      category: this.category,
      code: this.code,
      message: this.message,
      cause: this.cause,
      context: this.context,
    };
  }
}

function createError(
  category: ErrorCategory,
  code: string,
  message: string,
  options?: { cause?: unknown; context?: Record<string, unknown> }
): AppError {
  return { category, code, message, cause: options?.cause, context: options?.context };
}

export const Errors = {
  auth: {
    cancelled: (cause?: unknown) =>
      createError("AUTH", ErrorCode.AUTH.CANCELLED, "Authentication cancelled", { cause }),
    failed: (message = "Authentication failed", cause?: unknown) =>
      createError("AUTH", ErrorCode.AUTH.FAILED, message, { cause }),
    passkeyFailed: (message = "Passkey authentication failed", cause?: unknown) =>
      createError("AUTH", ErrorCode.AUTH.PASSKEY_FAILED, message, { cause }),
    passkeyUnsupported: (cause?: unknown) =>
      createError("AUTH", ErrorCode.AUTH.PASSKEY_UNSUPPORTED, "Device does not support passkey", {
        cause,
      }),
  },

  blockchain: {
    userRejected: (cause?: unknown) =>
      createError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.USER_REJECTED, "Transaction was cancelled", {
        cause,
      }),
    insufficientFunds: (cause?: unknown) =>
      createError(
        "BLOCKCHAIN",
        ErrorCode.BLOCKCHAIN.INSUFFICIENT_FUNDS,
        "Insufficient funds for this transaction",
        { cause }
      ),
    transactionFailed: (message = "Transaction failed", cause?: unknown) =>
      createError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.TRANSACTION_FAILED, message, { cause }),
    transactionReverted: (reason?: string, cause?: unknown) =>
      createError(
        "BLOCKCHAIN",
        ErrorCode.BLOCKCHAIN.TRANSACTION_REVERTED,
        reason || "Transaction reverted",
        { cause }
      ),
    contractError: (message: string, cause?: unknown) =>
      createError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.CONTRACT_ERROR, message, { cause }),
    rpcError: (message = "RPC request failed", cause?: unknown) =>
      createError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.RPC_ERROR, message, { cause }),
    timeout: (cause?: unknown) =>
      createError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.TIMEOUT, "Transaction timed out", { cause }),
  },

  network: {
    requestFailed: (message = "Network request failed", cause?: unknown) =>
      createError("NETWORK", ErrorCode.NETWORK.REQUEST_FAILED, message, { cause }),
    timeout: (cause?: unknown) =>
      createError("NETWORK", ErrorCode.NETWORK.TIMEOUT, "Request timed out", { cause }),
    offline: () => createError("NETWORK", ErrorCode.NETWORK.OFFLINE, "No internet connection"),
  },

  indexer: {
    fetchFailed: (message = "Failed to fetch data", cause?: unknown) =>
      createError("INDEXER", ErrorCode.INDEXER.FETCH_FAILED, message, { cause }),
    invalidResponse: (cause?: unknown) =>
      createError("INDEXER", ErrorCode.INDEXER.INVALID_RESPONSE, "Invalid response from indexer", {
        cause,
      }),
    unavailable: (cause?: unknown) =>
      createError("INDEXER", ErrorCode.INDEXER.UNAVAILABLE, "Indexer service unavailable", {
        cause,
      }),
  },

  deposit: {
    precondition: (message: string) =>
      createError("DEPOSIT", ErrorCode.DEPOSIT.PRECONDITION, message),
    commitmentFailed: (cause?: unknown) =>
      createError(
        "DEPOSIT",
        ErrorCode.DEPOSIT.COMMITMENT_FAILED,
        "Note generation failed. Please try again.",
        { cause }
      ),
    gasEstimationFailed: (cause?: unknown) =>
      createError(
        "DEPOSIT",
        ErrorCode.DEPOSIT.GAS_ESTIMATION_FAILED,
        "Gas estimation failed. Please try again.",
        { cause }
      ),
    transactionFailed: (message = "Transaction failed", cause?: unknown) =>
      createError("DEPOSIT", ErrorCode.DEPOSIT.TRANSACTION_FAILED, message, { cause }),
    trackingFailed: (cause?: unknown) =>
      createError("DEPOSIT", ErrorCode.DEPOSIT.TRACKING_FAILED, "Transaction tracking failed", {
        cause,
      }),
  },

  withdrawal: {
    precondition: (message: string) =>
      createError("WITHDRAWAL", ErrorCode.WITHDRAWAL.PRECONDITION, message),
    feeEstimationFailed: (cause?: unknown) =>
      createError(
        "WITHDRAWAL",
        ErrorCode.WITHDRAWAL.FEE_ESTIMATION_FAILED,
        "Fee estimation failed. Please try again.",
        { cause }
      ),
    contextFailed: (cause?: unknown) =>
      createError(
        "WITHDRAWAL",
        ErrorCode.WITHDRAWAL.CONTEXT_FAILED,
        "Failed to prepare withdrawal context",
        { cause }
      ),
    witnessFailed: (cause?: unknown) =>
      createError(
        "WITHDRAWAL",
        ErrorCode.WITHDRAWAL.WITNESS_FAILED,
        "Failed to generate witness data",
        { cause }
      ),
    proofFailed: (cause?: unknown) =>
      createError(
        "WITHDRAWAL",
        ErrorCode.WITHDRAWAL.PROOF_FAILED,
        "Proof generation failed. Please try again.",
        { cause }
      ),
    transactionFailed: (message = "Transaction failed", cause?: unknown) =>
      createError("WITHDRAWAL", ErrorCode.WITHDRAWAL.TRANSACTION_FAILED, message, { cause }),
    confirmationFailed: (cause?: unknown) =>
      createError(
        "WITHDRAWAL",
        ErrorCode.WITHDRAWAL.CONFIRMATION_FAILED,
        "Transaction confirmation failed",
        { cause }
      ),
    invalidAmount: (message = "Invalid withdrawal amount") =>
      createError("WITHDRAWAL", ErrorCode.WITHDRAWAL.INVALID_AMOUNT, message),
    invalidRecipient: (message = "Invalid recipient address") =>
      createError("WITHDRAWAL", ErrorCode.WITHDRAWAL.INVALID_RECIPIENT, message),
    insufficientBalance: (message = "Insufficient balance") =>
      createError("WITHDRAWAL", ErrorCode.WITHDRAWAL.INSUFFICIENT_BALANCE, message),
  },

  custom: (
    category: ErrorCategory,
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) => createError(category, code, message, options),
};

export function throwError(error: AppError): never {
  throw new AppException(error);
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "category" in error &&
    "code" in error &&
    "message" in error
  );
}

export function isAppException(error: unknown): error is AppException {
  return error instanceof AppException;
}

const CANCELLATION_PATTERNS = [
  "cancel",
  "cancelled",
  "canceled",
  "rejected",
  "denied",
  "abort",
  "aborted",
  "user denied",
  "user rejected",
  "action_rejected",
];

export function isUserCancellation(error: unknown): boolean {
  if (isAppError(error)) {
    if (error.code === ErrorCode.AUTH.CANCELLED) return true;
    if (error.code === ErrorCode.BLOCKCHAIN.USER_REJECTED) return true;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return CANCELLATION_PATTERNS.some((pattern) => msg.includes(pattern));
  }

  if (typeof error === "string") {
    const msg = error.toLowerCase();
    return CANCELLATION_PATTERNS.some((pattern) => msg.includes(pattern));
  }

  return false;
}

export function getUserMessage(error: unknown, fallback = "An unexpected error occurred"): string {
  if (isAppError(error)) return error.message;

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("user rejected") || msg.includes("user denied"))
      return "Transaction was cancelled";
    if (msg.includes("insufficient funds") || msg.includes("insufficient balance"))
      return "Insufficient funds for this transaction";
    if (msg.includes("minimumdepositamount")) return "Deposit amount is below the minimum required";
    if (msg.includes("contractpaused") || msg.includes("pausable: paused"))
      return "Contract is temporarily paused";
    if (msg.includes("gas required exceeds allowance") || msg.includes("out of gas"))
      return "Transaction would fail - insufficient gas";
    if (msg.includes("network") || msg.includes("failed to fetch"))
      return "Network error. Please check your connection.";
    if (msg.includes("timeout") || msg.includes("timed out"))
      return "Request timed out. Please try again.";

    if (msg.includes("contract call:") || msg.includes("contract function")) {
      const customErrorMatch = error.message.match(/Error:\s*(\w+)\(\)/);
      if (customErrorMatch) {
        const readable = customErrorMatch[1].replace(/([A-Z])/g, " $1").trim();
        return `Transaction failed: ${readable}`;
      }
      if (msg.includes("reverted")) return "Transaction failed. Please try again.";
      return "Contract call failed. Please try again.";
    }

    if (msg.includes("reverted")) {
      const match = error.message.match(/Error:\s*(\w+)\(\)/);
      if (match) {
        const readable = match[1].replace(/([A-Z])/g, " $1").trim();
        return `Transaction failed: ${readable}`;
      }
      return "Transaction would fail - please check your input";
    }

    if (error.message.length < 100 && !msg.includes("0x")) return error.message;
  }

  return fallback;
}

const errorCache = new Map<string, number>();
const DEDUPE_WINDOW_MS = 2000;

export function logError(
  error: unknown,
  context?: { action?: string; suppressed?: boolean; [key: string]: unknown }
): void {
  if (context?.suppressed) return;

  const errorMsg = error instanceof Error ? error.message : String(error);
  const cacheKey = `${context?.action ?? "unknown"}:${errorMsg}`;
  const now = Date.now();
  const lastLogged = errorCache.get(cacheKey);

  if (lastLogged && now - lastLogged < DEDUPE_WINDOW_MS) return;
  errorCache.set(cacheKey, now);

  if (errorCache.size > 100) {
    const cutoff = now - DEDUPE_WINDOW_MS * 5;
    for (const [key, timestamp] of errorCache.entries()) {
      if (timestamp < cutoff) errorCache.delete(key);
    }
  }

  const prefix = context?.action ? `[${context.action}]` : "[Error]";
  if (isAppError(error)) {
    console.warn(`${prefix} [${error.category}/${error.code}]`, error.message, context);
  } else if (error instanceof Error) {
    console.error(prefix, error.message, context);
  } else {
    console.error(prefix, error, context);
  }
}
