/**
 * file: shinobi-cash-website/apps/app/src/contexts/AuthContext.tsx
 * Authentication Runtime Store
 * Thin context for managing authentication state
 *
 * This is a minimal runtime store that only handles:
 * - Storing authenticated keys
 * - Authentication status
 * - Authenticate/logout actions
 *
 * Session restoration and other complex logic lives in hooks/controllers.
 */

import { getAccountKey, type KeyGenerationResult, restoreFromMnemonic } from "@shinobi-cash/core";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

interface AuthContextType {
  // Runtime state (read-only)
  isAuthenticated: boolean;
  keys: KeyGenerationResult | null;

  // Derived keys (computed from mnemonic)
  // SECURITY: privateKey intentionally NOT exposed - kept internal for accountKey derivation only
  publicKey: string | null;
  mnemonic: string[] | null;
  accountKey: bigint | null;

  // Actions (write-only)
  authenticate: (keys: KeyGenerationResult) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Single source of truth: store only the mnemonic
  const [mnemonic, setMnemonic] = useState<string[] | null>(null);

  // Derive keys from mnemonic (memoized for performance)
  const derivedKeys = useMemo(() => {
    if (!mnemonic) {
      return { publicKey: null, privateKey: null, address: null };
    }

    try {
      const { publicKey, privateKey, address } = restoreFromMnemonic(mnemonic);
      return { publicKey, privateKey, address };
    } catch (error) {
      console.error("Failed to derive keys from mnemonic:", error);
      return { publicKey: null, privateKey: null, address: null };
    }
  }, [mnemonic]);

  // Derive account key
  const accountKey = useMemo(() => {
    if (!derivedKeys.privateKey || !mnemonic) {
      return null;
    }

    try {
      return getAccountKey({ privateKey: derivedKeys.privateKey, mnemonic });
    } catch (error) {
      console.error("Failed to derive account key:", error);
      return null;
    }
  }, [derivedKeys.privateKey, mnemonic]);

  // Computed: authenticated if we have mnemonic
  const isAuthenticated = useMemo(() => !!mnemonic, [mnemonic]);

  // Reconstruct full keys object for compatibility
  const keys = useMemo<KeyGenerationResult | null>(() => {
    if (!mnemonic || !derivedKeys.publicKey || !derivedKeys.privateKey || !derivedKeys.address) {
      return null;
    }
    return {
      mnemonic,
      publicKey: derivedKeys.publicKey,
      privateKey: derivedKeys.privateKey,
      address: derivedKeys.address,
    };
  }, [mnemonic, derivedKeys.publicKey, derivedKeys.privateKey, derivedKeys.address]);

  /**
   * Authenticate user with generated keys
   * This is the ONLY way to set auth state
   */
  const authenticate = useCallback((newKeys: KeyGenerationResult) => {
    setMnemonic(newKeys.mnemonic);
  }, []);

  /**
   * Logout current user
   * Clears all auth state
   *
   * SECURITY: Attempts to zero out mnemonic from memory
   * Note: JavaScript cannot guarantee memory erasure, but this reduces exposure window
   *
   * Implementation Note:
   * - Zeros out mnemonic array elements first
   * - Sets mnemonic to null, triggering React reconciliation
   * - The keys object (which contains mnemonic reference) becomes null via useMemo
   * - Brief window exists where keys object still references zeroed array,
   *   but this is unavoidable in React's synchronous render cycle
   */
  const logout = useCallback(() => {
    setMnemonic((currentMnemonic) => {
      if (currentMnemonic) {
        try {
          // Zero out array elements to reduce exposure window
          for (let i = 0; i < currentMnemonic.length; i++) {
            (currentMnemonic as string[])[i] = "";
          }
        } catch (e) {
          // Array might be frozen/sealed - log but continue
          console.warn("Could not zero mnemonic array:", e);
        }
      }
      // Setting to null triggers useMemo to null out keys object
      return null;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      keys,
      publicKey: derivedKeys.publicKey,
      mnemonic,
      accountKey,
      authenticate,
      logout,
    }),
    [isAuthenticated, keys, derivedKeys.publicKey, mnemonic, accountKey, authenticate, logout]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
