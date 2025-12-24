/**
 * Add Passkey Flow Hook
 * Shared logic for adding passkey authentication to an account
 *
 * Used by:
 * - AccountSetupForm (new accounts)
 * - AddPasskeyModal (existing wallet accounts)
 * @file features/auth/hooks/useAddPasskeyFlow.ts
 *
 * Handles:
 * - Passkey setup with validation
 * - Error handling
 * - Sync baseline initialization
 * - Success callbacks
 */

import { useState, useCallback } from "react";
import { usePasskeyAuth } from "./usePasskeyAuth";
import { useAuthController } from "../controller/useAuthController";
import { storageManager } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import type { AuthError } from "../types";

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
  error: AuthError;
}

export function useAddPasskeyFlow(options: AddPasskeyFlowOptions = {}) {
  const { onSuccess, setAuthKeys = true } = options;
  const passkeyAuth = usePasskeyAuth();
  const authController = useAuthController();
  const [state, setState] = useState<AddPasskeyFlowState>({
    isProcessing: false,
    error: null,
  });

  /**
   * Add passkey to account
   *
   * @param accountName - Display name for the passkey
   * @param keys - Generated keys for the account
   * @returns true if successful, false otherwise
   */
  const addPasskey = useCallback(
    async (accountName: string, keys: KeyGenerationResult): Promise<boolean> => {
      setState({ isProcessing: true, error: null });

      try {
        // Setup passkey with generated keys
        const success = await passkeyAuth.setup(accountName, keys);

        if (!success) {
          if (passkeyAuth.error) {
            setState({ isProcessing: false, error: passkeyAuth.error });
          }
          return false;
        }

        // Set auth keys if this is a new account
        if (setAuthKeys) {
          authController.authenticate(keys);
        }

        // Initialize sync baseline for the account
        if (keys.publicKey) {
          try {
            await storageManager.initializeSyncBaseline(keys.publicKey);
          } catch (error) {
            console.warn("Failed to initialize sync baseline:", error);
            // Non-fatal - continue with success
          }
        }

        // Show success message
        showToast.auth.success(setAuthKeys ? "Account created" : "Passkey added successfully");

        setState({ isProcessing: false, error: null });

        // Call success callback
        onSuccess?.();

        return true;
      } catch (error) {
        console.error("Add passkey flow failed:", error);
        setState({
          isProcessing: false,
          error: { type: "passkey", message: "Failed to add passkey. Please try again." },
        });
        return false;
      }
    },
    [passkeyAuth, authController, setAuthKeys, onSuccess]
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
