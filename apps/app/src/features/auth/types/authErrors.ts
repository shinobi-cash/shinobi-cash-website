/**
 * Auth Error Types
 * Error domain typing for better error handling
 * @file features/auth/types/authErrors.ts
 */

// ============ ERROR DOMAINS ============

/**
 * Error domain typing - discriminated union
 * Allows UI to handle different error types appropriately
 */
export type AuthError =
  | { type: "passkey"; message: string; code?: string } // Passkey operation errors
  | { type: "wallet"; message: string; code?: string } // Wallet signature errors
  | { type: "validation"; message: string } // Form validation errors
  | { type: "account"; message: string; code?: string } // Account management errors
  | { type: "session"; message: string } // Session restoration errors
  | { type: "network"; message: string } // Network/storage errors
  | null;

// ============ ERROR HELPERS ============

/**
 * Create a passkey error
 */
export function createPasskeyError(message: string, code?: string): AuthError {
  return { type: "passkey", message, code };
}

/**
 * Create a wallet error
 */
export function createWalletError(message: string, code?: string): AuthError {
  return { type: "wallet", message, code };
}

/**
 * Create a validation error
 */
export function createValidationError(message: string): AuthError {
  return { type: "validation", message };
}

/**
 * Create an account error
 */
export function createAccountError(message: string, code?: string): AuthError {
  return { type: "account", message, code };
}

/**
 * Create a session error
 */
export function createSessionError(message: string): AuthError {
  return { type: "session", message };
}

/**
 * Create a network error
 */
export function createNetworkError(message: string): AuthError {
  return { type: "network", message };
}

// ============ ERROR NORMALIZATION ============

/**
 * Normalize any error to AuthError
 * Prevents drift between different auth hooks
 *
 * @param error - Unknown error from try/catch
 * @param context - Context of where error occurred (passkey, wallet, etc)
 * @returns Normalized AuthError
 */
export function normalizeAuthError(
  error: unknown,
  context: "passkey" | "wallet" | "account" | "session" | "network" = "network"
): AuthError {
  // Already an AuthError
  if (error && typeof error === "object" && "type" in error) {
    return error as AuthError;
  }

  // Error object
  if (error instanceof Error) {
    const message = error.message;

    // Detect user rejection
    if (
      message.includes("User rejected") ||
      message.includes("user rejected") ||
      message.includes("User denied") ||
      message.includes("user denied") ||
      message.includes("cancelled") ||
      message.includes("canceled")
    ) {
      if (context === "passkey") {
        return createPasskeyError("Authentication cancelled");
      }
      if (context === "wallet") {
        return createWalletError("Signature rejected");
      }
    }

    // Detect network errors
    if (message.includes("network") || message.includes("fetch") || message.includes("timeout")) {
      return createNetworkError(message);
    }

    // Context-specific error
    switch (context) {
      case "passkey":
        return createPasskeyError(message);
      case "wallet":
        return createWalletError(message);
      case "account":
        return createAccountError(message);
      case "session":
        return createSessionError(message);
      default:
        return createNetworkError(message);
    }
  }

  // String error
  if (typeof error === "string") {
    switch (context) {
      case "passkey":
        return createPasskeyError(error);
      case "wallet":
        return createWalletError(error);
      case "account":
        return createAccountError(error);
      case "session":
        return createSessionError(error);
      default:
        return createNetworkError(error);
    }
  }

  // Unknown error type
  return createNetworkError("An unexpected error occurred");
}
