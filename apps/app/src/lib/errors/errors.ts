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

/**
 * Unified error class for the application.
 * Extends Error for stack traces and throwability.
 * Use Errors.* factory functions to create instances.
 */
export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly context?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(
    category: ErrorCategory,
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(message);
    this.name = "AppError";
    this.category = category;
    this.code = code;
    this.cause = options?.cause;
    this.context = options?.context;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      category: this.category,
      code: this.code,
      message: this.message,
      cause: this.cause,
      context: this.context,
    };
  }
}

export const Errors = {
  auth: {
    cancelled: (cause?: unknown) =>
      new AppError("AUTH", ErrorCode.AUTH.CANCELLED, "Authentication cancelled", { cause }),
    failed: (message = "Authentication failed", cause?: unknown) =>
      new AppError("AUTH", ErrorCode.AUTH.FAILED, message, { cause }),
    passkeyFailed: (message = "Passkey authentication failed", cause?: unknown) =>
      new AppError("AUTH", ErrorCode.AUTH.PASSKEY_FAILED, message, { cause }),
    passkeyUnsupported: (cause?: unknown) =>
      new AppError("AUTH", ErrorCode.AUTH.PASSKEY_UNSUPPORTED, "Device does not support passkey", {
        cause,
      }),
    accountNotFound: (cause?: unknown) =>
      new AppError("AUTH", ErrorCode.AUTH.ACCOUNT_NOT_FOUND, "Account not found", { cause }),
    decryptionFailed: (message = "Failed to decrypt account data", cause?: unknown) =>
      new AppError("AUTH", ErrorCode.AUTH.DECRYPTION_FAILED, message, { cause }),
    sessionRequired: (cause?: unknown) =>
      new AppError("AUTH", ErrorCode.AUTH.FAILED, "Please sign in to continue", { cause }),
  },

  blockchain: {
    userRejected: (cause?: unknown) =>
      new AppError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.USER_REJECTED, "Transaction was cancelled", {
        cause,
      }),
    insufficientFunds: (cause?: unknown) =>
      new AppError(
        "BLOCKCHAIN",
        ErrorCode.BLOCKCHAIN.INSUFFICIENT_FUNDS,
        "Insufficient funds for this transaction",
        { cause }
      ),
    transactionFailed: (message = "Transaction failed", cause?: unknown) =>
      new AppError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.TRANSACTION_FAILED, message, { cause }),
    transactionReverted: (reason?: string, cause?: unknown) =>
      new AppError(
        "BLOCKCHAIN",
        ErrorCode.BLOCKCHAIN.TRANSACTION_REVERTED,
        reason || "Transaction reverted",
        { cause }
      ),
    contractError: (message: string, cause?: unknown) =>
      new AppError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.CONTRACT_ERROR, message, { cause }),
    rpcError: (message = "RPC request failed", cause?: unknown) =>
      new AppError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.RPC_ERROR, message, { cause }),
    timeout: (cause?: unknown) =>
      new AppError("BLOCKCHAIN", ErrorCode.BLOCKCHAIN.TIMEOUT, "Transaction timed out", { cause }),
  },

  network: {
    requestFailed: (message = "Network request failed", cause?: unknown) =>
      new AppError("NETWORK", ErrorCode.NETWORK.REQUEST_FAILED, message, { cause }),
    timeout: (cause?: unknown) =>
      new AppError("NETWORK", ErrorCode.NETWORK.TIMEOUT, "Request timed out", { cause }),
    offline: () => new AppError("NETWORK", ErrorCode.NETWORK.OFFLINE, "No internet connection"),
  },

  indexer: {
    fetchFailed: (message = "Failed to fetch data", cause?: unknown) =>
      new AppError("INDEXER", ErrorCode.INDEXER.FETCH_FAILED, message, { cause }),
    invalidResponse: (cause?: unknown) =>
      new AppError("INDEXER", ErrorCode.INDEXER.INVALID_RESPONSE, "Invalid response from indexer", {
        cause,
      }),
    unavailable: (cause?: unknown) =>
      new AppError("INDEXER", ErrorCode.INDEXER.UNAVAILABLE, "Indexer service unavailable", {
        cause,
      }),
  },

  deposit: {
    precondition: (message: string) =>
      new AppError("DEPOSIT", ErrorCode.DEPOSIT.PRECONDITION, message),
    commitmentFailed: (cause?: unknown) =>
      new AppError(
        "DEPOSIT",
        ErrorCode.DEPOSIT.COMMITMENT_FAILED,
        "Note generation failed. Please try again.",
        { cause }
      ),
    gasEstimationFailed: (cause?: unknown) =>
      new AppError(
        "DEPOSIT",
        ErrorCode.DEPOSIT.GAS_ESTIMATION_FAILED,
        "Gas estimation failed. Please try again.",
        { cause }
      ),
    transactionFailed: (message = "Transaction failed", cause?: unknown) =>
      new AppError("DEPOSIT", ErrorCode.DEPOSIT.TRANSACTION_FAILED, message, { cause }),
    trackingFailed: (cause?: unknown) =>
      new AppError("DEPOSIT", ErrorCode.DEPOSIT.TRACKING_FAILED, "Transaction tracking failed", {
        cause,
      }),
  },

  withdrawal: {
    precondition: (message: string) =>
      new AppError("WITHDRAWAL", ErrorCode.WITHDRAWAL.PRECONDITION, message),
    feeEstimationFailed: (cause?: unknown) =>
      new AppError(
        "WITHDRAWAL",
        ErrorCode.WITHDRAWAL.FEE_ESTIMATION_FAILED,
        "Fee estimation failed. Please try again.",
        { cause }
      ),
    contextFailed: (cause?: unknown) =>
      new AppError(
        "WITHDRAWAL",
        ErrorCode.WITHDRAWAL.CONTEXT_FAILED,
        "Failed to prepare withdrawal context",
        { cause }
      ),
    witnessFailed: (cause?: unknown) =>
      new AppError(
        "WITHDRAWAL",
        ErrorCode.WITHDRAWAL.WITNESS_FAILED,
        "Failed to generate witness data",
        { cause }
      ),
    proofFailed: (cause?: unknown) => {
      // Extract meaningful message from cause if available
      let message = "Proof generation failed. Please try again.";
      if (cause instanceof Error) {
        const causeMsg = cause.message.toLowerCase();
        if (causeMsg.includes("not found in state tree")) {
          message = "Note commitment not found. The indexer may still be syncing.";
        } else if (causeMsg.includes("not approved by asp")) {
          message = "Note not yet approved. Please wait for ASP approval.";
        } else if (causeMsg.includes("failed to load")) {
          message = "Failed to load circuit files. Please refresh and try again.";
        } else if (causeMsg.includes("failed verification")) {
          message = "Proof verification failed. Please try again.";
        }
      }
      return new AppError("WITHDRAWAL", ErrorCode.WITHDRAWAL.PROOF_FAILED, message, { cause });
    },
    transactionFailed: (message = "Transaction failed", cause?: unknown) =>
      new AppError("WITHDRAWAL", ErrorCode.WITHDRAWAL.TRANSACTION_FAILED, message, { cause }),
    confirmationFailed: (cause?: unknown) =>
      new AppError(
        "WITHDRAWAL",
        ErrorCode.WITHDRAWAL.CONFIRMATION_FAILED,
        "Transaction confirmation failed",
        { cause }
      ),
    invalidAmount: (message = "Invalid withdrawal amount") =>
      new AppError("WITHDRAWAL", ErrorCode.WITHDRAWAL.INVALID_AMOUNT, message),
    invalidRecipient: (message = "Invalid recipient address") =>
      new AppError("WITHDRAWAL", ErrorCode.WITHDRAWAL.INVALID_RECIPIENT, message),
    insufficientBalance: (message = "Insufficient balance") =>
      new AppError("WITHDRAWAL", ErrorCode.WITHDRAWAL.INSUFFICIENT_BALANCE, message),
  },
};

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
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
  "not allowed", // WebAuthn cancellation
];

export function isUserCancellation(error: unknown): boolean {
  if (error instanceof AppError) {
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
  if (error instanceof AppError) return error.message;

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
    if (msg.includes("not supported")) return "This feature is not supported on your device.";
    if (msg.includes("already enabled")) return "Quick Unlock is already enabled.";

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
  if (error instanceof AppError) {
    console.warn(`${prefix} [${error.category}/${error.code}]`, error.message, context);
  } else if (error instanceof Error) {
    console.error(prefix, error.message, context);
  } else {
    console.error(prefix, error, context);
  }
}
