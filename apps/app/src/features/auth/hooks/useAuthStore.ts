/**
 * Auth Store Hooks
 * Convenience hooks for accessing auth state
 */

import { useAuthStore as useStore } from "../domain/authStore";
import { useMemo } from "react";
import type { AuthMethod, AccountIndex } from "../domain/types";
import type { AuthState } from "../domain/state";

/**
 * UI-safe auth session
 * (NO cryptographic material)
 */
export type UiAuthSession = {
  accountName: string;
  authenticatedAt: number;
  method: AuthMethod;
};

/**
 * Get current auth session (UI-safe)
 */
export function useAuthSession(): UiAuthSession | null {
  return useStore((store) => {
    if (store.state.status !== "authenticated") return null;

    return {
      accountName: store.state.session.accountName,
      authenticatedAt: store.state.session.authenticatedAt,
      method: store.state.session.method,
    };
  });
}

/**
 * Check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  return useStore((store) => store.state.status === "authenticated");
}

/**
 * Get full auth state (discriminated union)
 */
export function useAuthState(): AuthState {
  return useStore((store) => store.state);
}

/**
 * Auth actions exposed to UI
 */
export function useAuthActions() {
  const bootstrap = useStore((s) => s.bootstrap);
  const startAccountCreation = useStore((s) => s.startAccountCreation);
  const selectAccount = useStore((s) => s.selectAccount);
  const authenticateWithWallet = useStore((s) => s.authenticateWithWallet);
  const logout = useStore((s) => s.logout);
  const clearError = useStore((s) => s.clearError);
  const setError = useStore((s) => s.setError);

  return useMemo(
    () => ({
      bootstrap,
      startAccountCreation,
      selectAccount,
      authenticateWithWallet,
      logout,
      clearError,
      setError,
    }),
    [
      bootstrap,
      startAccountCreation,
      selectAccount,
      authenticateWithWallet,
      logout,
      clearError,
      setError,
    ]
  );
}

/**
 * Available accounts (pre-auth)
 */
export function useAvailableAccounts(): AccountIndex[] {
  return useStore((store) =>
    store.state.status === "accounts-detected"
      ? store.state.accounts
      : []
  );
}

/**
 * Current auth method (if in progress)
 */
export function useCurrentAuthMethod(): AuthMethod | null {
  return useStore((store) => {
    if (store.state.status === "creating-account") {
      return store.state.method;
    }
    if (store.state.status === "authenticating") {
      return store.state.method;
    }
    return null;
  });
}

/**
 * Check if auth operation is in progress
 */
export function useIsAuthInProgress(): boolean {
  return useStore((store) => {
    const status = store.state.status;
    return (
      status === "booting" ||
      status === "creating-account" ||
      status === "authenticating"
    );
  });
}

/**
 * Get auth error (if any)
 */
export function useAuthError() {
  return useStore((store) =>
    store.state.status === "error"
      ? { error: store.state.error, retry: store.state.retry }
      : null
  );
}
