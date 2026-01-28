/**
 * Application Error Classes
 * Simplified for explorer app - only includes IndexerError and NetworkError
 */

export enum ErrorCategory {
  NETWORK = "NETWORK",
  INDEXER = "INDEXER",
}

/**
 * Base application error class
 */
export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: number;
  readonly isOperational: boolean;
  readonly cause?: unknown;

  constructor(
    category: ErrorCategory,
    code: string,
    message: string,
    options?: {
      cause?: unknown;
      context?: Record<string, unknown>;
      isOperational?: boolean;
    }
  ) {
    super(message);
    this.name = "AppError";
    this.category = category;
    this.code = code;
    this.context = options?.context;
    this.timestamp = Date.now();
    this.isOperational = options?.isOperational ?? true;
    this.cause = options?.cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      category: this.category,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      isOperational: this.isOperational,
      stack: this.stack,
    };
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends AppError {
  constructor(
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(ErrorCategory.NETWORK, code, message, options);
    this.name = "NetworkError";
  }
}

export const NETWORK_ERROR_CODES = {
  REQUEST_FAILED: "REQUEST_FAILED",
  TIMEOUT: "TIMEOUT",
  OFFLINE: "OFFLINE",
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

/**
 * Indexer-related errors
 */
export class IndexerError extends AppError {
  constructor(
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(ErrorCategory.INDEXER, code, message, options);
    this.name = "IndexerError";
  }
}

export const INDEXER_ERROR_CODES = {
  FETCH_FAILED: "FETCH_FAILED",
  PARSE_FAILED: "PARSE_FAILED",
  UNAVAILABLE: "UNAVAILABLE",
  INVALID_RESPONSE: "INVALID_RESPONSE",
} as const;
