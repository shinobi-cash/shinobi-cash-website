/**
 * Auth State Machine
 * Defines the discriminated union of all possible auth states
 */

import type { AccountIndex, AuthSession, AuthMethod, AuthError } from "./types";

// ============ STATE TRANSITION MAP ============

/**
 * Allowed State Transitions
 *
 * booting → authenticated (session restored)
 * booting → no-accounts (no accounts found)
 * booting → accounts-detected (accounts found)
 *
 * no-accounts → creating-account (user initiates account creation)
 * creating-account → authenticated (account created successfully)
 * creating-account → error (creation failed)
 *
 * accounts-detected → authenticating (user selects account)
 * authenticating → authenticated (auth successful)
 * authenticating → error (auth failed)
 *
 * authenticated → booting (logout)
 *
 * error → booting (retry/clear)
 * error → creating-account (retry creation)
 * error → authenticating (retry auth)
 */

// ============ AUTH STATE (Discriminated Union) ============

/**
 * AuthState - Type-safe state machine using discriminated unions
 * Each state is mutually exclusive with explicit data requirements
 */
export type AuthState =
  | BootingState
  | NoAccountsState
  | AccountsDetectedState
  | CreatingAccountState
  | AuthenticatingState
  | AuthenticatedState
  | ErrorState;

/**
 * BootingState - Initial state while checking for existing sessions/accounts
 */
export type BootingState = {
  status: "booting";
};

/**
 * NoAccountsState - No accounts found, user needs to create one
 */
export type NoAccountsState = {
  status: "no-accounts";
};

/**
 * AccountsDetectedState - Accounts found, user needs to select one
 */
export type AccountsDetectedState = {
  status: "accounts-detected";
  accounts: AccountIndex[];
};

/**
 * CreatingAccountState - Account creation in progress
 */
export type CreatingAccountState = {
  status: "creating-account";
  method: AuthMethod;
};

/**
 * AuthenticatingState - Authentication in progress
 */
export type AuthenticatingState = {
  status: "authenticating";
  method: AuthMethod;
  accountId: string;
};

/**
 * AuthenticatedState - Successfully authenticated with active session
 */
export type AuthenticatedState = {
  status: "authenticated";
  session: AuthSession;
};

/**
 * ErrorState - Authentication error occurred
 */
export type ErrorState = {
  status: "error";
  error: AuthError;
  /** Retry action to attempt recovery */
  retry?: () => void | Promise<void>;
};

// ============ INITIAL STATE ============

/**
 * Initial state when store is created
 */
export const INITIAL_STATE: AuthState = {
  status: "booting",
};

// ============ TYPE GUARDS ============

/**
 * Type guard to check if state is booting
 */
export function isBooting(state: AuthState): state is BootingState {
  return state.status === "booting";
}

/**
 * Type guard to check if state is no-accounts
 */
export function isNoAccounts(state: AuthState): state is NoAccountsState {
  return state.status === "no-accounts";
}

/**
 * Type guard to check if state is accounts-detected
 */
export function isAccountsDetected(state: AuthState): state is AccountsDetectedState {
  return state.status === "accounts-detected";
}

/**
 * Type guard to check if state is creating-account
 */
export function isCreatingAccount(state: AuthState): state is CreatingAccountState {
  return state.status === "creating-account";
}

/**
 * Type guard to check if state is authenticating
 */
export function isAuthenticating(state: AuthState): state is AuthenticatingState {
  return state.status === "authenticating";
}

/**
 * Type guard to check if state is authenticated
 */
export function isAuthenticated(state: AuthState): state is AuthenticatedState {
  return state.status === "authenticated";
}

/**
 * Type guard to check if state is error
 */
export function isError(state: AuthState): state is ErrorState {
  return state.status === "error";
}
