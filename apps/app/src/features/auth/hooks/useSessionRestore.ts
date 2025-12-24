/**
 * Session Restore Hook
 * Manages automatic session restoration on app load
 *
 * This hook has been moved OUT of AuthContext to maintain separation:
 * - AuthContext: thin runtime store
 * - useSessionRestore: session restoration logic
 * @file features/auth/hooks/useSessionRestore.ts
 *
 * Usage: Call this at app root level to handle auto-login
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  checkSessionResume,
  resumeWithPassword,
  resumeWithPasskey,
  clearSession,
} from "../protocol";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import type { AuthError } from "../types";
import { createSessionError } from "../types";

interface QuickAuthState {
  show: boolean;
  accountName: string;
}

interface SessionRestoreState {
  isRestoring: boolean;
  quickAuthState: QuickAuthState | null;
  error: AuthError;
}

interface SessionRestoreResult {
  isRestoring: boolean;
  quickAuthState: QuickAuthState | null;
  error: AuthError;
  handlePasswordAuth: (password: string) => Promise<void>;
  dismissQuickAuth: () => Promise<void>;
  clearError: () => void;
}

/**
 * Session Restore Hook
 * Automatically restores user session on app load
 *
 * @param onRestore - Called when session is successfully restored with keys
 */
export function useSessionRestore(
  onRestore: (keys: KeyGenerationResult) => void
): SessionRestoreResult {
  const [state, setState] = useState<SessionRestoreState>({
    isRestoring: true,
    quickAuthState: null,
    error: null,
  });

  // Prevent multiple concurrent restoration attempts (React Strict Mode protection)
  const restorationAttempted = useRef(false);

  // Store callback in ref to avoid dependency issues
  const onRestoreRef = useRef(onRestore);
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  /**
   * Attempt to restore session on mount
   */
  useEffect(() => {
    // Prevent multiple concurrent restoration attempts
    if (restorationAttempted.current) return;
    restorationAttempted.current = true;

    const restoreSession = async () => {
      try {
        const resume = await checkSessionResume();

        if (resume.status === "none") {
          // No session to restore
          setState({ isRestoring: false, quickAuthState: null, error: null });
          return;
        }

        if (resume.status === "password-needed") {
          // Password required for resume
          setState({
            isRestoring: true,
            quickAuthState: { show: true, accountName: resume.accountName },
            error: null,
          });
          return;
        }

        // Passkey available - auto-resume
        const keys = await resumeWithPasskey(resume.result.symmetricKey, resume.accountName);

        // Authenticate user with restored keys
        onRestoreRef.current(keys);

        setState({ isRestoring: false, quickAuthState: null, error: null });
      } catch (error) {
        console.error("Session restoration failed:", error);

        // Handle WebAuthn collision gracefully
        if (error instanceof Error && error.message.includes("A request is already pending")) {
          console.warn("WebAuthn request collision detected, skipping session clear");
        } else {
          await clearSession();
        }

        setState({
          isRestoring: false,
          quickAuthState: null,
          error: createSessionError("Session restoration failed"),
        });
      }
    };

    restoreSession();
  }, []);

  // Store quick auth state in ref for callback access
  const quickAuthStateRef = useRef(state.quickAuthState);
  useEffect(() => {
    quickAuthStateRef.current = state.quickAuthState;
  }, [state.quickAuthState]);

  /**
   * Handle password-based quick auth
   */
  const handlePasswordAuth = useCallback(async (password: string): Promise<void> => {
    const currentQuickAuthState = quickAuthStateRef.current;
    if (!currentQuickAuthState) return;

    setState((prev) => ({ ...prev, isRestoring: true, error: null }));

    try {
      const keys = await resumeWithPassword(password, currentQuickAuthState.accountName);

      // Authenticate user with restored keys
      onRestoreRef.current(keys);

      setState({ isRestoring: false, quickAuthState: null, error: null });
    } catch (error) {
      console.error("Quick password auth failed:", error);
      setState((prev) => ({
        ...prev,
        isRestoring: false,
        error: createSessionError("Password authentication failed"),
      }));
      throw error; // Re-throw for UI error handling
    }
  }, []);

  /**
   * Dismiss quick auth prompt
   */
  const dismissQuickAuth = useCallback(async () => {
    await clearSession();
    setState({ isRestoring: false, quickAuthState: null, error: null });
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    isRestoring: state.isRestoring,
    quickAuthState: state.quickAuthState,
    error: state.error,
    handlePasswordAuth,
    dismissQuickAuth,
    clearError,
  };
}
