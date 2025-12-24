/**
 * Auth Method Types
 * Type-safe authentication methods
 * @file features/auth/types/authMethod.ts
 */

// ============ AUTH METHOD ============

/**
 * Authentication method used for login
 */
export type AuthMethod =
  | "passkey" // WebAuthn passkey with PRF extension
  | "password" // Password-based authentication
  | "wallet"; // Wallet signature-based authentication

// ============ METHOD LABELS ============

/**
 * UI labels for auth methods
 */
export const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  passkey: "Passkey",
  password: "Password",
  wallet: "Wallet",
};

// ============ LOGIN METHOD ============

/**
 * Specific login method chosen by user (nullable during selection)
 */
export type LoginMethod = AuthMethod | null;
