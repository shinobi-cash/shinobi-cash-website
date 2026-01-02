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
  startWalletSignIn: () => void;

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
       * Simplified: Silent passkey restore → unauthenticated if fails
       */
      bootstrap: async () => {
        set({ state: { status: "booting" } });

        try {
          const { bootstrap: bootstrapAuth } = await import("../services/authService");
          const result = await bootstrapAuth();

          if (result.type === "session-restored") {
            // 🔐 Crypto session already restored via passkey (silent, automatic)
            console.debug("[AuthStore] Session restored via passkey quick unlock");
            set({
              state: {
                status: "authenticated",
                session: {
                  accountName: "restored", // Will be updated with actual accountId
                  method: "passkey",
                  authenticatedAt: Date.now(),
                },
              },
            });
            return;
          }

          // No session restored → show wallet login
          console.debug("[AuthStore] No session restored, showing wallet login");
          set({ state: { status: "unauthenticated" } });
        } catch (error) {
          console.warn("[AuthStore] Bootstrap failed, showing wallet login", error);
          // Graceful fallback: show wallet login even on error
          set({ state: { status: "unauthenticated" } });
        }
      },

      /**
       * Start wallet sign-in flow
       */
      startWalletSignIn: () => {
        set({ state: { status: "signing-in" } });
      },

      /**
       * Authenticate with wallet signature
       */
      authenticateWithWallet: async (accountId, signature, walletAddress, chainId) => {
        set({ state: { status: "signing-in", accountId } });

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
            () => get().authenticateWithWallet(accountId, signature, walletAddress, chainId)
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
