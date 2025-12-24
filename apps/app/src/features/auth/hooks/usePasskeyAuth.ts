/**
 * Passkey Auth Hook
 * Manages passkey login and setup operations
 * @file features/auth/hooks/usePasskeyAuth.ts
 */

import { useState, useCallback } from "react";
import { performPasskeyLogin, performPasskeySetup } from "../protocol";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import type { AuthError } from "../types";
import { createPasskeyError, createAccountError } from "../types";
import { AuthError as LegacyAuthError, AuthErrorCode } from "@/lib/errors/AuthError";

interface PasskeyAuthState {
  isProcessing: boolean;
  error: AuthError;
}

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

      let authError: AuthError;
      if (error instanceof LegacyAuthError) {
        if (error.code === AuthErrorCode.PASSKEY_NOT_FOUND) {
          authError = createAccountError("No passkey found for this account", error.code);
        } else if (error.code === AuthErrorCode.PASSKEY_CANCELLED) {
          authError = createPasskeyError("Login cancelled", error.code);
        } else {
          authError = createPasskeyError(error.message || "Passkey login failed", error.code);
        }
      } else {
        authError = createPasskeyError("Passkey login failed. Please try again.");
      }

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

        let authError: AuthError;
        if (error instanceof LegacyAuthError) {
          if (error.code === AuthErrorCode.PASSKEY_PRF_UNSUPPORTED) {
            authError = createPasskeyError(
              "Device not supported - passkeys with PRF extension required",
              error.code
            );
          } else if (error.code === AuthErrorCode.ACCOUNT_ALREADY_EXISTS) {
            authError = createAccountError("Passkey already exists for this account", error.code);
          } else if (error.code === AuthErrorCode.PASSKEY_CANCELLED) {
            authError = createPasskeyError("Setup cancelled. Please try again.", error.code);
          } else {
            authError = createPasskeyError(error.message || "Passkey setup failed", error.code);
          }
        } else {
          authError = createPasskeyError("Passkey setup failed. Please try again.");
        }

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
