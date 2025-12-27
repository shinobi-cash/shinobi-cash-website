/**
 * file: shinobi-cash-website/apps/app/src/contexts/AuthContext.tsx
 * Authentication Runtime Store
 * Minimal runtime store for managing authentication state
 *
 * Handles:
 * - Storing authenticated keys
 * - Authentication status
 * - Authenticate/logout actions
 * - Session restoration (via useSessionRestore hook)
 */

import { useSessionRestore } from "@/features/auth/session/useSession";
import { getAccountKey, type KeyGenerationResult } from "@shinobi-cash/core";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

interface AuthContextType {
  // Runtime state (read-only)
  isAuthenticated: boolean;
  isRestoring: boolean; // Session restore in progress
  publicKey: string | null;
  accountKey: bigint | null;

  // Actions
  authenticate: (keys: KeyGenerationResult) => void;
  logout: () => void;

  // Internal access (for special cases like AddPasskeyModal)
  // Returns full KeyGenerationResult including mnemonic and privateKey
  // Should be used sparingly - most components should use publicKey/accountKey
  getFullKeys: () => KeyGenerationResult | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Store full KeyGenerationResult (includes mnemonic, publicKey, privateKey, address)
  const [keys, setKeys] = useState<KeyGenerationResult | null>(null);

  // Derive account key once from stored keys
  const accountKey = useMemo(() => {
    if (!keys) return null;

    try {
      // Pass only privateKey since it's more efficient than deriving from mnemonic
      return getAccountKey({ privateKey: keys.privateKey });
    } catch (error) {
      console.error("Failed to derive account key:", error);
      return null;
    }
  }, [keys]);

  // Computed: authenticated if we have keys
  const isAuthenticated = useMemo(() => !!keys, [keys]);

  /**
   * Authenticate user with generated keys
   * This is the ONLY way to set auth state
   */
  const authenticate = useCallback((newKeys: KeyGenerationResult) => {
    setKeys(newKeys);
  }, []);

  /**
   * Logout current user
   * Clears all auth state
   */
  const logout = useCallback(() => {
    setKeys(null);
  }, []);

  /**
   * Get full keys including mnemonic and privateKey
   * For special cases only (e.g., AddPasskeyModal)
   */
  const getFullKeys = useCallback(() => keys, [keys]);

  // Auto-restore session on mount
  const { isRestoring } = useSessionRestore(authenticate);

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isRestoring,
      publicKey: keys?.publicKey ?? null,
      accountKey,
      authenticate,
      logout,
      getFullKeys,
    }),
    [isAuthenticated, isRestoring, keys?.publicKey, accountKey, authenticate, logout, getFullKeys]
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
