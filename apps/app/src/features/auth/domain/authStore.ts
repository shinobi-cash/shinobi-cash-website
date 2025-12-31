/**
 * Auth Store
 * Zustand state machine for authentication
 *
 * SECURITY INVARIANT:
 * - AuthStore NEVER holds private keys or crypto material
 * - Session object is UI-only metadata
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AuthState } from "./state";
import { INITIAL_STATE } from "./state";
import type { AuthMethod, AuthErrorCode } from "./types";

// ============ STORE INTERFACE ============

interface AuthStore {
  state: AuthState;

  bootstrap: () => Promise<void>;
  startAccountCreation: (method: AuthMethod) => void;
  selectAccount: (accountId: string, method: AuthMethod) => void;

  authenticateWithWallet: (
    accountId: string,
    signature: string,
    walletAddress: string,
    chainId: number
  ) => Promise<void>;

  markAuthenticated: (accountId: string, method: AuthMethod) => void;

  logout: () => Promise<void>;
  clearError: () => void;

  setError: (error: import("./types").AuthError, retry?: () => void | Promise<void>) => void;
}

// ============ STORE IMPLEMENTATION ============

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      state: INITIAL_STATE,

      /**
       * Bootstrap authentication system
       */
      bootstrap: async () => {
        set({ state: { status: "booting" } });

        try {
          const { bootstrap: bootstrapAuth } = await import("../services/authService");
          const { listAccountIndexes } = await import("../services/accountIndexService");

          const result = await bootstrapAuth();

          if (result.type === "session-restored") {
            // 🔐 Crypto session already restored internally
            set({
              state: {
                status: "authenticated",
                session: {
                  accountName: "restored",
                  method: "passkey", // best-effort; UI-only
                  authenticatedAt: Date.now(),
                },
              },
            });
            return;
          }

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
       * Select account to authenticate
       */
      selectAccount: async (accountId, method) => {
        set({ state: { status: "authenticating", method, accountId } });

        if (method === "passkey") {
          try {
            const { authenticate } = await import("../services/authService");
            await authenticate(accountId, "passkey");
            get().markAuthenticated(accountId, "passkey");
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
      },

      /**
       * Authenticate with wallet signature
       */
      authenticateWithWallet: async (accountId, signature, walletAddress, chainId) => {
        set({ state: { status: "authenticating", method: "wallet", accountId } });

        try {
          const { authenticate } = await import("../services/authService");
          await authenticate(accountId, "wallet", {
            signature,
            walletAddress,
            chainId,
          });

          get().markAuthenticated(accountId, "wallet");
        } catch (error) {
          get().setError(
            {
              code: "WALLET_SIGNATURE_FAILED" as AuthErrorCode,
              message: error instanceof Error ? error.message : "Wallet authentication failed",
              timestamp: Date.now(),
              originalError: error,
            },
            () => get().selectAccount(accountId, "wallet")
          );
        }
      },

      /**
       * Mark authenticated (UI-only session)
       */
      markAuthenticated: (accountId, method) => {
        set({
          state: {
            status: "authenticated",
            session: {
              accountName: accountId,
              method,
              authenticatedAt: Date.now(),
            },
          },
        });
      },

      /**
       * Logout
       */
      logout: async () => {
        try {
          const { logout } = await import("../services/authService");
          await logout();
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
       * Clear error and re-bootstrap
       */
      clearError: () => {
        get().bootstrap();
      },

      /**
       * Set error state
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

export type { AuthStore };
