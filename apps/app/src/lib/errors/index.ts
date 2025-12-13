/**
 * Error Handling Exports
 * Central export point for all error-related utilities
 */

// Error classes and codes
export {
  AppError,
  BlockchainError,
  BLOCKCHAIN_ERROR_CODES,
  DepositError,
  DEPOSIT_ERROR_CODES,
  ErrorCategory,
  IndexerError,
  INDEXER_ERROR_CODES,
  NetworkError,
  NETWORK_ERROR_CODES,
  StorageError,
  STORAGE_ERROR_CODES,
  ValidationError,
  VALIDATION_ERROR_CODES,
  WithdrawalError,
  WITHDRAWAL_ERROR_CODES,
} from "./AppErrors";

// Auth errors (re-export from existing file)
export { AuthError, AuthErrorCode, isUserCancelledError, mapPasskeyError } from "./AuthError";

// Error handler utilities
export {
  getErrorCategory,
  getUserMessage,
  isRecoverable,
  isUserCancellation,
  logError,
  shouldReport,
  wrapError,
} from "./errorHandler";
