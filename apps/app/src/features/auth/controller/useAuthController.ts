/**
 * Auth Controller
 * Complete auth management including session restoration
 *
 * This controller wraps:
 * - AuthContext (runtime state)
 * - useSessionRestore (auto-login logic)
 *
 * Provides a single, clean API for UI components.
 * @file features/auth/controller/useAuthController.ts
 */

import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { storageManager, KDF } from "@/lib/storage";

interface AuthController {
  // State (read-only)
  isAuthenticated: boolean;
  isRestoring: boolean; // Session restore in progress

  // Derived keys (read-only) - only expose what UI needs
  publicKey: string | null;
  accountKey: bigint | null;

  // Actions
  authenticate: (keys: KeyGenerationResult) => void;
  logout: () => Promise<void>;
}

/**
 * Auth Controller Hook
 * Provides controlled access to all auth functionality
 *
 * UI components should ONLY use this hook, never useAuth() directly
 */
export function useAuthController(): AuthController {
  const auth = useAuth();

  /**
   * Authenticate user with generated keys
   */
  const authenticate = useCallback(
    (keys: KeyGenerationResult) => {
      auth.authenticate(keys);
    },
    [auth]
  );

  /**
   * Logout current user and clear session
   */
  const logout = useCallback(async () => {
    auth.logout();
    await storageManager.clearSession();
    await KDF.clearSessionInfo();
  }, [auth]);

  return {
    // State
    isAuthenticated: auth.isAuthenticated,
    isRestoring: auth.isRestoring,
    publicKey: auth.publicKey,
    accountKey: auth.accountKey,

    // Actions
    authenticate,
    logout,
  };
}
