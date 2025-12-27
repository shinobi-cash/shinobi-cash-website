/**
 * Passkey Hooks
 *
 * Provides React hooks for passkey authentication operations.
 * Includes basic auth operations and high-level passkey setup flow.
 */

import { useState, useCallback } from "react";
import { performPasskeyLogin, performPasskeySetup } from "./passkeyAuth";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";

interface PasskeyAuthState {
  isProcessing: boolean;
  error: AuthError | null;
}

/**
 * Basic Passkey Auth Hook
 * Provides low-level passkey operations (login, setup)
 */
export function usePasskeyAuth() {
  const [state, setState] = useState<PasskeyAuthState>({
    isProcessing: false,
    error: null,
  });

  /**
   * Login with passkey
   */
  const login = useCallback(async (accountName: string): Promise<KeyGenerationResult | null> => {
    setState({ isProcessing: true, error: null });

    try {
      const keys = await performPasskeyLogin(accountName);
      setState({ isProcessing: false, error: null });
      return keys;
    } catch (error) {
      console.error("Passkey login failed:", error);

      const authError = error instanceof AuthError
        ? error
        : new AuthError(AuthErrorCode.PASSKEY_FAILED, "Passkey login failed. Please try again.");

      setState({ isProcessing: false, error: authError });
      return null;
    }
  }, []);

  /**
   * Setup passkey for new account
   */
  const setup = useCallback(
    async (accountName: string, generatedKeys: KeyGenerationResult): Promise<boolean> => {
      setState({ isProcessing: true, error: null });

      try {
        await performPasskeySetup(accountName, generatedKeys);
        setState({ isProcessing: false, error: null });
        return true;
      } catch (error) {
        console.error("Passkey setup failed:", error);

        const authError = error instanceof AuthError
          ? error
          : new AuthError(AuthErrorCode.PASSKEY_FAILED, "Passkey setup failed. Please try again.");

        setState({ isProcessing: false, error: authError });
        return false;
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    isProcessing: state.isProcessing,
    error: state.error,
    login,
    setup,
    clearError,
  };
}

// ============ ADD PASSKEY FLOW ============

interface AddPasskeyFlowOptions {
  /**
   * Called after successful passkey setup
   */
  onSuccess?: () => void;

  /**
   * Whether to set auth keys after setup
   * Default: true (for new accounts)
   * Set to false for existing accounts that are already authenticated
   */
  setAuthKeys?: boolean;
}

interface AddPasskeyFlowState {
  isProcessing: boolean;
  error: AuthError | null;
}

/**
 * Add Passkey Flow Hook
 *
 * High-level hook for complete passkey setup flow.
 * Handles passkey setup, auth state, sync initialization, and success callbacks.
 *
 * Used by:
 * - AccountSetupForm (new accounts)
 * - AddPasskeyModal (existing wallet accounts)
 */
export function useAddPasskeyFlow(options: AddPasskeyFlowOptions = {}) {
  const { onSuccess } = options;
  const passkeyAuth = usePasskeyAuth();
  const [state, setState] = useState<AddPasskeyFlowState>({
    isProcessing: false,
    error: null,
  });

  /**
   * Add passkey to account
   */
  const addPasskey = useCallback(
    async (accountName: string, keys: KeyGenerationResult): Promise<boolean> => {
      setState({ isProcessing: true, error: null });

      try {
        const success = await passkeyAuth.setup(accountName, keys);

        if (!success) {
          if (passkeyAuth.error) {
            setState({ isProcessing: false, error: passkeyAuth.error });
          }
          return false;
        }

        // Note: Auth controller integration and sync baseline init would be handled
        // by the component using this hook, to avoid circular dependencies

        setState({ isProcessing: false, error: null });
        onSuccess?.();

        return true;
      } catch (error) {
        console.error("Add passkey flow failed:", error);

        const authError = error instanceof AuthError
          ? error
          : new AuthError(AuthErrorCode.PASSKEY_FAILED, "Failed to add passkey. Please try again.");

        setState({ isProcessing: false, error: authError });
        return false;
      }
    },
    [passkeyAuth, onSuccess]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    isProcessing: state.isProcessing || passkeyAuth.isProcessing,
    error: state.error || passkeyAuth.error,
    addPasskey,
    clearError,
  };
}
