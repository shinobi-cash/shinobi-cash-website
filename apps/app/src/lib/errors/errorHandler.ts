/**
 * Error Handler Utilities
 * Centralized error handling logic for consistent error processing across the app
 */

import { AuthError, AuthErrorCode, isUserCancelledError as isAuthCancelled } from "./AuthError";
import {
  AppError,
  BlockchainError,
  BLOCKCHAIN_ERROR_CODES,
  ErrorCategory,
  IndexerError,
  NetworkError,
} from "./AppErrors";

// Lazy import to avoid circular dependencies
let reportErrorToSentry: ((error: unknown, context?: Record<string, unknown>) => void) | null =
  null;

// Initialize Sentry integration if available
if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true") {
  import("../monitoring/sentry")
    .then((module) => {
      reportErrorToSentry = module.reportErrorToSentry;
    })
    .catch(() => {
      // Sentry not installed or disabled
    });
}

/**
 * Extract user-friendly error message from any error type
 */
export function getUserMessage(error: unknown, fallback = "An unexpected error occurred"): string {
  // AppError types already have user-friendly messages
  if (error instanceof AppError) {
    return error.message;
  }

  // AuthError types already have user-friendly messages
  if (error instanceof AuthError) {
    return error.message;
  }

  // Standard Error
  if (error instanceof Error) {
    // Map common blockchain error patterns to user-friendly messages
    const msg = error.message.toLowerCase();

    if (msg.includes("user rejected") || msg.includes("user denied")) {
      return "Transaction was cancelled";
    }

    if (msg.includes("insufficient funds") || msg.includes("insufficient balance")) {
      return "Insufficient funds for this transaction";
    }

    if (msg.includes("network") || msg.includes("failed to fetch")) {
      return "Network error. Please check your connection and try again.";
    }

    if (msg.includes("timeout") || msg.includes("timed out")) {
      return "Request timed out. Please try again.";
    }

    // Return original message if it's not too technical
    if (error.message.length < 100 && !msg.includes("0x")) {
      return error.message;
    }
  }

  return fallback;
}

/**
 * Check if error represents a user cancellation (shouldn't show error toast)
 */
export function isUserCancellation(error: unknown): boolean {
  // Check AuthError cancellation
  if (error instanceof AuthError && error.code === AuthErrorCode.PASSKEY_CANCELLED) {
    return true;
  }

  // Check AppError for blockchain user rejection
  if (error instanceof BlockchainError && error.code === BLOCKCHAIN_ERROR_CODES.USER_REJECTED) {
    return true;
  }

  // Check Error message patterns
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const patterns = [
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

    return patterns.some((pattern) => msg.includes(pattern));
  }

  // Check using auth helper for broader cancellation detection
  return isAuthCancelled(error);
}

/**
 * Determine if error is recoverable (can retry)
 */
export function isRecoverable(error: unknown): boolean {
  if (error instanceof AppError) {
    // Network errors are always recoverable
    if (error.category === ErrorCategory.NETWORK) {
      return true;
    }

    // Some blockchain errors are recoverable
    if (error.category === ErrorCategory.BLOCKCHAIN) {
      const recoverableCodes = [
        BLOCKCHAIN_ERROR_CODES.RPC_ERROR,
        BLOCKCHAIN_ERROR_CODES.TRANSACTION_TIMEOUT,
        BLOCKCHAIN_ERROR_CODES.NETWORK_ERROR,
      ];
      return recoverableCodes.includes(error.code as never);
    }

    // Indexer errors are recoverable
    if (error.category === ErrorCategory.INDEXER) {
      return true;
    }
  }

  // Network/timeout errors are recoverable
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("network") || msg.includes("timeout") || msg.includes("failed to fetch");
  }

  return false;
}

// Error deduplication cache (prevents logging same error multiple times in quick succession)
const errorCache = new Map<string, number>();
const DEDUPE_WINDOW_MS = 2000; // Don't log same error within 2 seconds

/**
 * Log error with appropriate level and structured context
 * Includes deduplication to prevent spamming logs during retries
 */
export function logError(
  error: unknown,
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    suppressed?: boolean; // Already checked before calling
    [key: string]: unknown;
  }
): void {
  // Skip if already marked as suppressed
  if (context?.suppressed) return;

  // Generate cache key for deduplication
  const errorMsg = error instanceof Error ? error.message : String(error);
  const cacheKey = `${context?.action ?? "unknown"}:${errorMsg}`;
  const now = Date.now();
  const lastLogged = errorCache.get(cacheKey);

  // Skip if same error was just logged (likely a retry)
  if (lastLogged && now - lastLogged < DEDUPE_WINDOW_MS) {
    return;
  }

  // Update cache
  errorCache.set(cacheKey, now);

  // Clean up old cache entries (prevent memory leak)
  if (errorCache.size > 100) {
    const cutoff = now - DEDUPE_WINDOW_MS * 5;
    for (const [key, timestamp] of errorCache.entries()) {
      if (timestamp < cutoff) {
        errorCache.delete(key);
      }
    }
  }

  const timestamp = new Date().toISOString();

  // Build structured error info
  const errorInfo = {
    timestamp,
    error: serializeError(error),
    context: context ?? {},
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    url: typeof window !== "undefined" ? window.location.href : "unknown",
  };

  // Development logging - simplified for expected errors
  if (process.env.NODE_ENV === "development") {
    // Check if it's an expected operational error (network, indexer, etc.)
    const isExpectedError =
      (error instanceof AppError && error.isOperational) ||
      error instanceof NetworkError ||
      error instanceof IndexerError ||
      (error instanceof Error && error.message.toLowerCase().includes("failed to fetch"));

    if (isExpectedError) {
      // Simplified logging for expected errors
      console.warn(
        `[${context?.action ?? "Unknown"}]`,
        error instanceof Error ? error.message : String(error),
        context
      );
      return;
    }

    // Detailed logging for unexpected errors
    console.group(`[Error] ${context?.action ?? "Unknown Action"}`);
    console.error("Error:", error);
    console.log("Context:", context);
    console.log("Full Info:", errorInfo);
    console.groupEnd();
    return;
  }

  // Production logging
  if (error instanceof AppError) {
    // Log operational errors as warnings (expected errors)
    if (error.isOperational) {
      console.warn(`[${error.category}/${error.code}]`, error.message, errorInfo);
    } else {
      // Log programming errors as errors (unexpected)
      console.error(`[${error.category}/${error.code}]`, error.message, errorInfo);
    }

    // Send to error monitoring if enabled
    if (shouldReport(error)) {
      reportToMonitoring(error, context);
    }
  } else if (error instanceof AuthError) {
    console.warn(`[AUTH/${error.code}]`, error.message, errorInfo);
  } else {
    // Unknown errors - always log as error
    console.error("[UNKNOWN_ERROR]", errorInfo);

    // Always report unknown errors to monitoring
    reportToMonitoring(error, context);
  }
}

/**
 * Serialize error to JSON-safe object
 */
function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof AppError) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: "cause" in error && error.cause ? serializeError(error.cause) : undefined,
    };
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { type: typeof error, value: String(error) };
    }
  }

  return { type: typeof error, value: String(error) };
}

/**
 * Get error category for analytics/monitoring
 */
export function getErrorCategory(error: unknown): string {
  if (error instanceof AppError) {
    return error.category;
  }

  if (error instanceof AuthError) {
    return ErrorCategory.AUTH;
  }

  if (error instanceof Error) {
    // Infer category from error message
    const msg = error.message.toLowerCase();

    if (msg.includes("network") || msg.includes("fetch")) {
      return ErrorCategory.NETWORK;
    }

    if (msg.includes("transaction") || msg.includes("blockchain")) {
      return ErrorCategory.BLOCKCHAIN;
    }

    if (msg.includes("storage") || msg.includes("database")) {
      return ErrorCategory.STORAGE;
    }
  }

  return "UNKNOWN";
}

/**
 * Wrap unknown errors in appropriate AppError type
 */
export function wrapError(
  error: unknown,
  category: ErrorCategory,
  code: string,
  message: string
): AppError {
  return new AppError(category, code, message, {
    cause: error,
    context: {
      originalError: serializeError(error),
    },
  });
}

/**
 * Check if error should be reported to monitoring
 */
export function shouldReport(error: unknown): boolean {
  // Don't report user cancellations
  if (isUserCancellation(error)) {
    return false;
  }

  // Report all non-operational errors (programming errors)
  if (error instanceof AppError && !error.isOperational) {
    return true;
  }

  // Report critical operational errors
  if (error instanceof AppError) {
    const criticalCategories = [ErrorCategory.BLOCKCHAIN, ErrorCategory.STORAGE];
    return criticalCategories.includes(error.category);
  }

  // Report unknown errors
  if (!(error instanceof AppError) && !(error instanceof AuthError)) {
    return true;
  }

  return false;
}

/**
 * Report error to monitoring service (Sentry, etc.)
 */
function reportToMonitoring(error: unknown, context?: Record<string, unknown>): void {
  // Only report if monitoring is enabled
  if (!reportErrorToSentry) {
    return;
  }

  try {
    reportErrorToSentry(error, context);
  } catch (err) {
    // Don't let monitoring errors crash the app
    console.error("Failed to report error to monitoring:", err);
  }
}
