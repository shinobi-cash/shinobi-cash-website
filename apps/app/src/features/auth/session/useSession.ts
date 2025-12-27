/**
 * Session Restore Hook
 *
 * Manages automatic session restoration on app load.
 * Separated from AuthContext to maintain clean separation:
 * - AuthContext handles runtime authentication state
 * - useSessionRestore handles automatic session recovery
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { checkSessionResume, resumeWithPasskey, clearSession } from "./sessionManagement";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";

interface QuickAuthState {
  show: boolean;
  accountName: string;
}

interface SessionRestoreState {
  isRestoring: boolean;
  quickAuthState: QuickAuthState | null;
  error: AuthError | null;
}

interface SessionRestoreResult {
  isRestoring: boolean;
  quickAuthState: QuickAuthState | null;
  error: AuthError | null;
  dismissQuickAuth: () => Promise<void>;
  clearError: () => void;
}

/**
 * Session Restore Hook
 * Automatically restores user session on app load
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
    if (restorationAttempted.current) return;
    restorationAttempted.current = true;

    const restoreSession = async () => {
      try {
        const resume = await checkSessionResume();

        if (resume.status === "none") {
          setState({ isRestoring: false, quickAuthState: null, error: null });
          return;
        }

        // Passkey available - auto-resume
        const keys = await resumeWithPasskey(resume.result.symmetricKey, resume.accountName);

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

        const authError = error instanceof AuthError
          ? error
          : new AuthError(AuthErrorCode.UNKNOWN, "Session restoration failed");

        setState({
          isRestoring: false,
          quickAuthState: null,
          error: authError,
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
    dismissQuickAuth,
    clearError,
  };
}
