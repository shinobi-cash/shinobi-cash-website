// Status types
/**
 * Auth Status Types
 * Semantic status representation for auth state machine
 * @file features/auth/types/authStatus.ts
 */

// ============ AUTH STEP ENUM ============

/**
 * Auth step in the multi-step flow
 */
export type AuthStep =
  | "login-convenient" // Login with passkey or wallet
  | "create-keys" // Generate new keys from wallet signature
  | "setup-convenient" // Setup passkey for new account
  | "syncing-notes"; // Syncing notes after auth

// ============ AUTH STATUS ENUM ============

/**
 * Auth flow status - minimal state machine
 * Only includes states actually used by the controller
 */
export type AuthStatus =
  | "checking-accounts" // Bootstrapping: session restore & account check
  | "ready" // Ready for user action
  | "syncing" // Syncing notes after auth
  | "error"; // Authentication failed

// ============ STATUS LABELS ============

/**
 * UI labels for each status
 * Separated from status enum to allow i18n and A/B testing
 */
export const AUTH_STATUS_LABELS: Record<AuthStatus, string> = {
  "checking-accounts": "Checking accounts...",
  ready: "Ready",
  syncing: "Syncing notes...",
  error: "Authentication failed",
};

// ============ STEP LABELS ============

/**
 * UI labels for auth steps
 */
export const AUTH_STEP_LABELS: Record<AuthStep, string> = {
  "login-convenient": "Sign In",
  "create-keys": "Generate Keys",
  "setup-convenient": "Setup Account",
  "syncing-notes": "Syncing Notes",
};


// Method types
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
  | "wallet"; // Wallet signature-based authentication

// ============ METHOD LABELS ============

/**
 * UI labels for auth methods
 */
export const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  passkey: "Passkey",
  wallet: "Wallet",
};

// ============ LOGIN METHOD ============

/**
 * Specific login method chosen by user (nullable during selection)
 */
export type LoginMethod = AuthMethod | null;

