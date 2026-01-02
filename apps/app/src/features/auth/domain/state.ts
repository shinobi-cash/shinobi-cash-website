/**
 * Auth State Machine
 * Defines the discriminated union of all possible auth states
 */

import type { AuthMethod, AuthError } from "./types";

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
// Simplified: Wallet-only auth model with passkey as convenience unlock

export type AuthState =
  | BootingState
  | UnauthenticatedState
  | SigningInState
  | AuthenticatedState
  | ErrorState;

export type BootingState = {
  status: "booting";
};

export type UnauthenticatedState = {
  status: "unauthenticated";
};

export type SigningInState = {
  status: "signing-in";
  accountId?: string; // Optional: may not have accountId during initial wallet creation
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

export function isUnauthenticated(state: AuthState): state is UnauthenticatedState {
  return state.status === "unauthenticated";
}

export function isSigningIn(state: AuthState): state is SigningInState {
  return state.status === "signing-in";
}

export function isAuthenticated(state: AuthState): state is AuthenticatedState {
  return state.status === "authenticated";
}

export function isError(state: AuthState): state is ErrorState {
  return state.status === "error";
}
