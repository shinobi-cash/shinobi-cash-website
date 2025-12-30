/**
 * Auth Store
 * Zustand state machine for authentication with devtools
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AuthState } from "./state";
import { INITIAL_STATE } from "./state";
import type { AuthMethod, AuthSession, AuthErrorCode } from "./types";

// ============ STORE INTERFACE ============

/**
 * AuthStore - Zustand store interface
 * Actions are methods that transition state
 */
interface AuthStore {
  /** Current auth state */
  state: AuthState;

  /** Bootstrap the auth system on app mount */
  bootstrap: () => Promise<void>;

  /** Start creating a new account */
  startAccountCreation: (method: AuthMethod) => void;

  /** Complete account creation with session */
  completeAccountCreation: (session: AuthSession) => void;

  /** Select an existing account to authenticate */
  selectAccount: (accountId: string, method: AuthMethod) => void;

  /** Authenticate with wallet (requires signature, address, chainId) */
  authenticateWithWallet: (accountId: string, signature: string, walletAddress: string, chainId: number) => Promise<void>;

  /** Complete authentication with session */
  authenticate: (session: AuthSession) => void;

  /** Logout and clear session */
  logout: () => Promise<void>;

  /** Clear error and return to appropriate state */
  clearError: () => void;

  /** Set error state with optional retry */
  setError: (error: import("./types").AuthError, retry?: () => void | Promise<void>) => void;
}

// ============ STORE IMPLEMENTATION ============

/**
 * useAuthStore - Main auth state management
 *
 * IMPORTANT: Actions are placeholders for Phase 1
 * Will be implemented in Phase 2 with actual service calls
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      state: INITIAL_STATE,

      /**
       * Bootstrap - Check for existing session or accounts
       * Called once on app mount
       */
      bootstrap: async () => {
        set({ state: { status: "booting" } });

        try {
          const { bootstrap: bootstrapAuth } = await import("../services/authService");
          const { listAccountIndexes } = await import("../services/accountIndexService");

          const result = await bootstrapAuth();

          if (result.type === "session-restored") {
            set({ state: { status: "authenticated", session: result.session } });
            return;
          }

          // No session - check for accounts
          if (result.hasAccounts) {
            const accounts = await listAccountIndexes();
            set({ state: { status: "accounts-detected", accounts } });
          } else {
            set({ state: { status: "no-accounts" } });
          }
        } catch (error) {
          get().setError(
            {
              code: "INITIALIZATION_FAILED" as AuthErrorCode,
              message: "Failed to initialize auth system",
              timestamp: Date.now(),
              originalError: error,
            },
            () => get().bootstrap()
          );
        }
      },

      /**
       * Start account creation flow
       */
      startAccountCreation: (method) => {
        set({ state: { status: "creating-account", method } });
      },

      /**
       * Complete account creation with new session
       * TODO Phase 2: Implement with authService.createAccount()
       */
      completeAccountCreation: (session) => {
        set({ state: { status: "authenticated", session } });
      },

      /**
       * Select account to authenticate
       * For passkey: triggers authentication immediately
       * For wallet: shows authenticating UI, actual auth happens when wallet provides signature
       */
      selectAccount: async (accountId, method) => {
        set({ state: { status: "authenticating", method, accountId } });

        // For passkey, authenticate immediately
        if (method === "passkey") {
          try {
            const { authenticate: authService } = await import("../services/authService");
            const session = await authService(accountId, method);
            get().authenticate(session);
          } catch (error) {
            get().setError(
              {
                code: "PASSKEY_AUTH_FAILED" as AuthErrorCode,
                message: error instanceof Error ? error.message : "Passkey authentication failed",
                timestamp: Date.now(),
                originalError: error,
              },
              () => get().selectAccount(accountId, method)
            );
          }
        }
        // For wallet auth, UI needs to trigger wallet signing and call authenticateWithWallet
      },

      /**
       * Authenticate with wallet signature
       * Called by UI after wallet provides signature
       */
      authenticateWithWallet: async (accountId, signature, walletAddress, chainId) => {
        set({ state: { status: "authenticating", method: "wallet", accountId } });

        try {
          const { authenticate: authService } = await import("../services/authService");
          const session = await authService(accountId, "wallet", {
            signature,
            walletAddress,
            chainId,
          });
          get().authenticate(session);
        } catch (error) {
          get().setError(
            {
              code: "WALLET_SIGNATURE_FAILED" as AuthErrorCode,
              message: error instanceof Error ? error.message : "Wallet authentication failed",
              timestamp: Date.now(),
              originalError: error,
            },
            () => get().authenticateWithWallet(accountId, signature, walletAddress, chainId)
          );
        }
      },

      /**
       * Complete authentication with session
       * Called by auth service after successful authentication
       */
      authenticate: (session) => {
        set({ state: { status: "authenticated", session } });
      },

      /**
       * Logout - Clear session and return to bootstrap
       */
      logout: async () => {
        try {
          const { logout: logoutService } = await import("../services/authService");
          await logoutService();

          // Return to bootstrap to check for other accounts
          await get().bootstrap();
        } catch (error) {
          get().setError(
            {
              code: "UNKNOWN_ERROR" as AuthErrorCode,
              message: "Failed to logout",
              timestamp: Date.now(),
              originalError: error,
            },
            () => get().logout()
          );
        }
      },

      /**
       * Clear error state
       * Returns to booting to re-bootstrap
       */
      clearError: () => {
        get().bootstrap();
      },

      /**
       * Set error state with optional retry action
       */
      setError: (error, retry) => {
        set({
          state: {
            status: "error",
            error,
            retry,
          },
        });
      },
    }),
    { name: "AuthStore" }
  )
);

// ============ EXPORTS ============

/**
 * Export store and types
 */
export type { AuthStore };
