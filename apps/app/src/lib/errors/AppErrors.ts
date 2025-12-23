/**
 * Application Error Classes
 * Provides structured error types with context for better error handling and debugging
 */

export enum ErrorCategory {
  NETWORK = "NETWORK",
  BLOCKCHAIN = "BLOCKCHAIN",
  STORAGE = "STORAGE",
  VALIDATION = "VALIDATION",
  WITHDRAWAL = "WITHDRAWAL",
  DEPOSIT = "DEPOSIT",
  AUTH = "AUTH",
  INDEXER = "INDEXER",
}

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: number;
  readonly isOperational: boolean; // true = expected error, false = programming error
  readonly cause?: unknown; // Error cause chain

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

    // Maintains proper stack trace for where our error was thrown (only available on V8)
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
 * Withdrawal-related errors
 */
export class WithdrawalError extends AppError {
  constructor(
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(ErrorCategory.WITHDRAWAL, code, message, options);
    this.name = "WithdrawalError";
  }
}

export const WITHDRAWAL_ERROR_CODES = {
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  PROOF_GENERATION_FAILED: "PROOF_GENERATION_FAILED",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  NOTE_ALREADY_SPENT: "NOTE_ALREADY_SPENT",
  NOTE_NOT_FOUND: "NOTE_NOT_FOUND",
  INVALID_RECIPIENT: "INVALID_RECIPIENT",
  PREPARATION_FAILED: "PREPARATION_FAILED",
} as const;

/**
 * Deposit-related errors
 */
export class DepositError extends AppError {
  constructor(
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(ErrorCategory.DEPOSIT, code, message, options);
    this.name = "DepositError";
  }
}

export const DEPOSIT_ERROR_CODES = {
  COMMITMENT_GENERATION_FAILED: "COMMITMENT_GENERATION_FAILED",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_AMOUNT: "INVALID_AMOUNT",
} as const;

/**
 * Blockchain/Smart Contract errors
 */
export class BlockchainError extends AppError {
  constructor(
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(ErrorCategory.BLOCKCHAIN, code, message, options);
    this.name = "BlockchainError";
  }
}

export const BLOCKCHAIN_ERROR_CODES = {
  RPC_ERROR: "RPC_ERROR",
  TRANSACTION_TIMEOUT: "TRANSACTION_TIMEOUT",
  TRANSACTION_REVERTED: "TRANSACTION_REVERTED",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  USER_REJECTED: "USER_REJECTED",
  NETWORK_ERROR: "NETWORK_ERROR",
  CONTRACT_ERROR: "CONTRACT_ERROR",
} as const;

/**
 * Storage/IndexedDB errors
 */
export class StorageError extends AppError {
  constructor(
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(ErrorCategory.STORAGE, code, message, options);
    this.name = "StorageError";
  }
}

export const STORAGE_ERROR_CODES = {
  DB_INIT_FAILED: "DB_INIT_FAILED",
  DB_READ_FAILED: "DB_READ_FAILED",
  DB_WRITE_FAILED: "DB_WRITE_FAILED",
  DB_DELETE_FAILED: "DB_DELETE_FAILED",
  ENCRYPTION_FAILED: "ENCRYPTION_FAILED",
  DECRYPTION_FAILED: "DECRYPTION_FAILED",
  NOT_FOUND: "NOT_FOUND",
} as const;

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

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(
    code: string,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> }
  ) {
    super(ErrorCategory.VALIDATION, code, message, options);
    this.name = "ValidationError";
  }
}

export const VALIDATION_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",
  OUT_OF_RANGE: "OUT_OF_RANGE",
} as const;
