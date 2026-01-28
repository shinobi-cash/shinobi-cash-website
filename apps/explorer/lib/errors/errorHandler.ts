/**
 * Error Handler Utilities
 * Simplified for explorer app - only includes essential error handling
 */

import { AppError, IndexerError, NetworkError } from "./AppErrors";

/**
 * Extract user-friendly error message from any error type
 */
export function getUserMessage(error: unknown, fallback = "An unexpected error occurred"): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("network") || msg.includes("failed to fetch")) {
      return "Network error. Please check your connection and try again.";
    }

    if (msg.includes("timeout") || msg.includes("timed out")) {
      return "Request timed out. Please try again.";
    }

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
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    const patterns = ["cancel", "cancelled", "canceled", "abort", "aborted"];
    return patterns.some((pattern) => msg.includes(pattern));
  }
  return false;
}

// Error deduplication cache
const errorCache = new Map<string, number>();
const DEDUPE_WINDOW_MS = 2000;

/**
 * Log error with deduplication
 */
export function logError(
  error: unknown,
  context?: {
    action?: string;
    suppressed?: boolean;
    [key: string]: unknown;
  }
): void {
  if (context?.suppressed) return;

  const errorMsg = error instanceof Error ? error.message : String(error);
  const cacheKey = `${context?.action ?? "unknown"}:${errorMsg}`;
  const now = Date.now();
  const lastLogged = errorCache.get(cacheKey);

  if (lastLogged && now - lastLogged < DEDUPE_WINDOW_MS) {
    return;
  }

  errorCache.set(cacheKey, now);

  // Clean up old cache entries
  if (errorCache.size > 100) {
    const cutoff = now - DEDUPE_WINDOW_MS * 5;
    for (const [key, timestamp] of errorCache.entries()) {
      if (timestamp < cutoff) {
        errorCache.delete(key);
      }
    }
  }

  // Simplified logging
  if (process.env.NODE_ENV === "development") {
    const isExpectedError =
      (error instanceof AppError && error.isOperational) ||
      error instanceof NetworkError ||
      error instanceof IndexerError ||
      (error instanceof Error && error.message.toLowerCase().includes("failed to fetch"));

    if (isExpectedError) {
      console.warn(
        `[${context?.action ?? "Unknown"}]`,
        error instanceof Error ? error.message : String(error),
        context
      );
      return;
    }

    console.error(`[Error] ${context?.action ?? "Unknown"}:`, error, context);
    return;
  }

  // Production: simple logging
  if (error instanceof AppError) {
    if (error.isOperational) {
      console.warn(`[${error.category}/${error.code}]`, error.message);
    } else {
      console.error(`[${error.category}/${error.code}]`, error.message);
    }
  } else {
    console.error("[UNKNOWN_ERROR]", error);
  }
}
