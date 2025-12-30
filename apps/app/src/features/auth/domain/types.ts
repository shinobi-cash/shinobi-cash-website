/**
 * Auth Domain Types
 * Pure type definitions with no dependencies
 */

// ============ ACCOUNT INDEX ============

/**
 * AccountIndex - Unencrypted account metadata for pre-auth discovery
 * Renamed from AccountMetadata to reflect its role as the canonical index
 */
export type AccountIndex = {
  id: string;
  type: AuthMethod;
  publicKeyHash: string;
  createdAt: number;
};

// ============ AUTH SESSION ============

/**
 * AuthSession - Runtime authenticated state
 * Contains full keys and derived values for an active session
 */
export type AuthSession = {
  accountName: string;
  publicKey: string;
  privateKey: string;
  address: string;
  accountKey: bigint;
  authenticatedAt: number;
};

// ============ AUTH METHOD ============

/**
 * AuthMethod - Authentication mechanism type
 */
export type AuthMethod = "passkey" | "wallet";

// ============ ERROR TYPES ============

/**
 * AuthErrorCode - Enumeration of auth error types
 */
export enum AuthErrorCode {
  // Passkey errors
  PASSKEY_NOT_SUPPORTED = "PASSKEY_NOT_SUPPORTED",
  PASSKEY_NOT_FOUND = "PASSKEY_NOT_FOUND",
  PASSKEY_CREATION_FAILED = "PASSKEY_CREATION_FAILED",
  PASSKEY_AUTH_FAILED = "PASSKEY_AUTH_FAILED",
  PASSKEY_USER_CANCELLED = "PASSKEY_USER_CANCELLED",

  // Wallet errors
  WALLET_NOT_CONNECTED = "WALLET_NOT_CONNECTED",
  WALLET_SIGNATURE_FAILED = "WALLET_SIGNATURE_FAILED",
  WALLET_USER_REJECTED = "WALLET_USER_REJECTED",

  // Account errors
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  ACCOUNT_ALREADY_EXISTS = "ACCOUNT_ALREADY_EXISTS",

  // Session errors
  SESSION_EXPIRED = "SESSION_EXPIRED",
  SESSION_INITIALIZATION_FAILED = "SESSION_INITIALIZATION_FAILED",

  // Generic errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INITIALIZATION_FAILED = "INITIALIZATION_FAILED",
}

/**
 * AuthError - Structured error type for auth failures
 */
export type AuthError = {
  code: AuthErrorCode;
  message: string;
  timestamp: number;
  originalError?: unknown;
};

// ============ HELPER FUNCTIONS ============

/**
 * Create an AuthError
 */
export function createAuthError(
  code: AuthErrorCode,
  message: string,
  originalError?: unknown
): AuthError {
  return {
    code,
    message,
    timestamp: Date.now(),
    originalError,
  };
}

/**
 * Check if an error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "timestamp" in error
  );
}
