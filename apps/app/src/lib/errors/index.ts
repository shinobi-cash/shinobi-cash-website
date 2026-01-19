/**
 * Error Handling - Unified Export
 */

export {
  // Core types
  type AppError,
  type ErrorCategory,
  ErrorCode,
  // Error class (for throwing)
  AppException,
  // Factory functions
  Errors,
  throwError,
  // Type guards
  isAppError,
  isAppException,
  // Utilities
  isUserCancellation,
  getUserMessage,
  logError,
} from "./errors";
