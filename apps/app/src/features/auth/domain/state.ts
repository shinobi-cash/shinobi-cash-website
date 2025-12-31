/**
 * Auth State Machine
 * Defines the discriminated union of all possible auth states
 */

import type { AccountIndex, AuthMethod, AuthError } from "./types";

// ============ UI SESSION TYPE (SAFE) ============

/**
 * UiAuthSession
 *
 * SECURITY INVARIANT:
 * - Contains NO cryptographic material
 * - Used only for UI state & routing
 */
export type UiAuthSession = {
  accountName: string;
  method: AuthMethod;
  authenticatedAt: number;
};

// ============ AUTH STATE (Discriminated Union) ============

export type AuthState =
  | BootingState
  | NoAccountsState
  | AccountsDetectedState
  | CreatingAccountState
  | AuthenticatingState
  | AuthenticatedState
  | ErrorState;

export type BootingState = {
  status: "booting";
};

export type NoAccountsState = {
  status: "no-accounts";
};

export type AccountsDetectedState = {
  status: "accounts-detected";
  accounts: AccountIndex[];
};

export type CreatingAccountState = {
  status: "creating-account";
  method: AuthMethod;
};

export type AuthenticatingState = {
  status: "authenticating";
  method: AuthMethod;
  accountId: string;
};

export type AuthenticatedState = {
  status: "authenticated";
  session: UiAuthSession;
};

export type ErrorState = {
  status: "error";
  error: AuthError;
  retry?: () => void | Promise<void>;
};

// ============ INITIAL STATE ============

export const INITIAL_STATE: AuthState = {
  status: "booting",
};

// ============ TYPE GUARDS ============

export function isBooting(state: AuthState): state is BootingState {
  return state.status === "booting";
}

export function isNoAccounts(state: AuthState): state is NoAccountsState {
  return state.status === "no-accounts";
}

export function isAccountsDetected(state: AuthState): state is AccountsDetectedState {
  return state.status === "accounts-detected";
}

export function isCreatingAccount(state: AuthState): state is CreatingAccountState {
  return state.status === "creating-account";
}

export function isAuthenticating(state: AuthState): state is AuthenticatingState {
  return state.status === "authenticating";
}

export function isAuthenticated(state: AuthState): state is AuthenticatedState {
  return state.status === "authenticated";
}

export function isError(state: AuthState): state is ErrorState {
  return state.status === "error";
}
