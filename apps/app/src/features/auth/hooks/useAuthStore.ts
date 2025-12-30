/**
 * Auth Store Hooks
 * Convenience hooks for accessing auth state
 */

import { useAuthStore as useStore } from "../domain/authStore";
import { useMemo } from "react";
import type { AuthSession, AuthMethod, AccountIndex } from "../domain/types";
import type { AuthState } from "../domain/state";

/**
 * Get current auth session
 * Returns null if not authenticated
 *
 * @returns AuthSession if authenticated, null otherwise
 */
export function useAuthSession(): AuthSession | null {
  return useStore((state) =>
    state.state.status === "authenticated" ? state.state.session : null
  );
}

/**
 * Check if user is authenticated
 *
 * @returns true if authenticated, false otherwise
 */
export function useIsAuthenticated(): boolean {
  return useStore((state) => state.state.status === "authenticated");
}

/**
 * Get current auth state
 * Useful for conditional rendering based on status
 *
 * @returns Current AuthState
 */
export function useAuthState(): AuthState {
  return useStore((state) => state.state);
}

/**
 * Get auth actions
 * Returns stable action methods from the store
 * Memoized to prevent infinite re-renders
 */
export function useAuthActions() {
  const bootstrap = useStore((state) => state.bootstrap);
  const startAccountCreation = useStore((state) => state.startAccountCreation);
  const completeAccountCreation = useStore((state) => state.completeAccountCreation);
  const selectAccount = useStore((state) => state.selectAccount);
  const authenticate = useStore((state) => state.authenticate);
  const logout = useStore((state) => state.logout);
  const clearError = useStore((state) => state.clearError);
  const setError = useStore((state) => state.setError);

  return useMemo(
    () => ({
      bootstrap,
      startAccountCreation,
      completeAccountCreation,
      selectAccount,
      authenticate,
      logout,
      clearError,
      setError,
    }),
    [bootstrap, startAccountCreation, completeAccountCreation, selectAccount, authenticate, logout, clearError, setError]
  );
}

/**
 * Get available accounts
 * Returns empty array if not in accounts-detected state
 *
 * @returns Array of AccountIndex
 */
export function useAvailableAccounts(): AccountIndex[] {
  return useStore((state) =>
    state.state.status === "accounts-detected" ? state.state.accounts : []
  );
}

/**
 * Get current auth method
 * Returns null if not creating/authenticating
 *
 * @returns AuthMethod if in progress, null otherwise
 */
export function useCurrentAuthMethod(): AuthMethod | null {
  return useStore((state) => {
    if (state.state.status === "creating-account") {
      return state.state.method;
    }
    if (state.state.status === "authenticating") {
      return state.state.method;
    }
    return null;
  });
}

/**
 * Check if auth operation is in progress
 *
 * @returns true if creating account or authenticating
 */
export function useIsAuthInProgress(): boolean {
  return useStore((state) => {
    const status = state.state.status;
    return status === "creating-account" || status === "authenticating" || status === "booting";
  });
}

/**
 * Get error state
 * Returns null if no error
 *
 * @returns AuthError if in error state, null otherwise
 */
export function useAuthError() {
  return useStore((state) =>
    state.state.status === "error"
      ? { error: state.state.error, retry: state.state.retry }
      : null
  );
}

/**
 * Get account key (for note encryption)
 * Returns null if not authenticated
 *
 * @returns accountKey bigint if authenticated, null otherwise
 */
export function useAccountKey(): bigint | null {
  return useStore((state) =>
    state.state.status === "authenticated" ? state.state.session.accountKey : null
  );
}

/**
 * Get public key
 * Returns null if not authenticated
 *
 * @returns publicKey string if authenticated, null otherwise
 */
export function usePublicKey(): string | null {
  return useStore((state) =>
    state.state.status === "authenticated" ? state.state.session.publicKey : null
  );
}

/**
 * Get address
 * Returns null if not authenticated
 *
 * @returns address string if authenticated, null otherwise
 */
export function useAddress(): string | null {
  return useStore((state) =>
    state.state.status === "authenticated" ? state.state.session.address : null
  );
}
