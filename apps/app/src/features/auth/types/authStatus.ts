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
 * Auth flow status - semantic state machine
 * Enables i18n, A/B testing, and UI-agnostic controllers
 */
export type AuthStatus =
  | "idle" // Initial state
  | "checking-accounts" // Checking for existing accounts
  | "ready" // Ready for user action
  | "authenticating" // Processing login/setup
  | "generating-keys" // Generating keys from signature
  | "setting-up" // Setting up passkey
  | "syncing" // Syncing notes
  | "authenticated" // Successfully authenticated
  | "error"; // Authentication failed

// ============ STATUS LABELS ============

/**
 * UI labels for each status
 * Separated from status enum to allow i18n and A/B testing
 */
export const AUTH_STATUS_LABELS: Record<AuthStatus, string> = {
  idle: "Authentication",
  "checking-accounts": "Checking accounts...",
  ready: "Ready",
  authenticating: "Authenticating...",
  "generating-keys": "Generating keys...",
  "setting-up": "Setting up account...",
  syncing: "Syncing notes...",
  authenticated: "Authenticated",
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
