/**
 * Authentication Context
 * Manages user authentication state with secure key management
 *
 * Optimized to store only the root mnemonic and derive all keys on-demand
 * using memoization to prevent unnecessary re-renders.
 */

import { useNavigation } from "@/contexts/NavigationContext";
import { storageManager, KDF } from "@/lib/storage";
import { getAccountKey, type KeyGenerationResult, restoreFromMnemonic } from "@shinobi-cash/core";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface QuickAuthState {
  show: boolean;
  accountName: string;
}

interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isRestoringSession: boolean;

  // Account keys (derived from mnemonic)
  publicKey: string | null;
  privateKey: string | null;
  mnemonic: string[] | null;
  accountKey: bigint | null;

  // Session restoration state
  quickAuthState: QuickAuthState | null;

  // Actions
  setKeys: (keys: KeyGenerationResult) => void;
  signOut: () => void;
  handleQuickPasswordAuth: (password: string) => Promise<void>;
  dismissQuickAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setCurrentScreen } = useNavigation();

  // Single source of truth: only store the mnemonic
  const [mnemonic, setMnemonic] = useState<string[] | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [quickAuthState, setQuickAuthState] = useState<QuickAuthState | null>(null);

  // Prevent multiple concurrent restoration attempts (React Strict Mode protection)
  const restorationAttempted = useRef(false);

  // Derive keys from mnemonic (expensive crypto operations, but only runs when mnemonic changes)
  const derivedKeys = useMemo(() => {
    if (!mnemonic) {
      return { publicKey: null, privateKey: null };
    }

    try {
      const { publicKey, privateKey } = restoreFromMnemonic(mnemonic);
      return { publicKey, privateKey };
    } catch (error) {
      console.error("Failed to derive keys from mnemonic:", error);
      return { publicKey: null, privateKey: null };
    }
  }, [mnemonic]);

  // Derive account key (cheap operation since we have privateKey cached)
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

  // Derived state: authenticated if we have the mnemonic (and thus all keys)
  const isAuthenticated = useMemo(() => {
    return !!mnemonic;
  }, [mnemonic]);

  // Redirect to home when authentication is lost
  useEffect(() => {
    if (!isRestoringSession && !isAuthenticated) {
      setCurrentScreen("home");
    }
  }, [isAuthenticated, isRestoringSession, setCurrentScreen]);

  // Session restoration effect
  useEffect(() => {
    // Prevent multiple concurrent restoration attempts
    if (restorationAttempted.current) return;
    restorationAttempted.current = true;

    const restoreSession = async () => {
      try {
        const resume = await KDF.resumeAuth();
        if (resume.status === "none") {
          setIsRestoringSession(false);
          return;
        }

        if (resume.status === "password-needed") {
          setQuickAuthState({ show: true, accountName: resume.accountName });
          return;
        }

        // passkey-ready
        const { result, accountName } = resume;
        await storageManager.initializeAccountSession(accountName, result.symmetricKey);
        const accountData = await storageManager.getAccountData();
        if (!accountData) throw new Error("Account data not found");

        setMnemonic(accountData.mnemonic);
        setIsRestoringSession(false);
      } catch (error) {
        console.error("Session restoration failed:", error);
        if (error instanceof Error && error.message.includes("A request is already pending")) {
          console.warn("WebAuthn request collision detected, skipping session clear");
        } else {
          storageManager.clearSession();
          await KDF.clearSessionInfo();
        }
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

  // Use refs for state that callbacks need to access
  const quickAuthStateRef = useRef(quickAuthState);
  useEffect(() => {
    quickAuthStateRef.current = quickAuthState;
  }, [quickAuthState]);

  // Memoize callback functions to prevent unnecessary re-renders
  // Using refs ensures callbacks don't change when state changes
  const setKeys = useCallback((newKeys: KeyGenerationResult) => {
    setMnemonic(newKeys.mnemonic);
  }, []);

  const handleQuickPasswordAuth = useCallback(async (password: string) => {
    const currentQuickAuthState = quickAuthStateRef.current;
    if (!currentQuickAuthState) return;

    try {
      const { symmetricKey } = await KDF.deriveKeyFromPassword(password, currentQuickAuthState.accountName);
      await storageManager.initializeAccountSession(currentQuickAuthState.accountName, symmetricKey);
      const accountData = await storageManager.getAccountData();
      if (!accountData) throw new Error("Account data not found");

      setMnemonic(accountData.mnemonic);
      await KDF.storeSessionInfo(currentQuickAuthState.accountName, "password");
      setQuickAuthState(null);
      setIsRestoringSession(false);
    } catch (error) {
      console.error("Quick password auth failed:", error);
      throw error;
    }
  }, []);

  const dismissQuickAuth = useCallback(async () => {
    setQuickAuthState(null);
    setIsRestoringSession(false);
    storageManager.clearSession();
    await KDF.clearSessionInfo();
  }, []);

  const signOut = useCallback(async () => {
    setMnemonic(null);
    storageManager.clearSession();
    await KDF.clearSessionInfo();
    setQuickAuthState(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders when parent re-renders
  const contextValue = useMemo(() => ({
    isAuthenticated,
    isRestoringSession,
    publicKey: derivedKeys.publicKey,
    privateKey: derivedKeys.privateKey,
    mnemonic,
    accountKey,
    quickAuthState,
    setKeys,
    signOut,
    handleQuickPasswordAuth,
    dismissQuickAuth,
  }), [
    isAuthenticated,
    isRestoringSession,
    derivedKeys.publicKey,
    derivedKeys.privateKey,
    mnemonic,
    accountKey,
    quickAuthState,
    // Don't include callbacks - they're already memoized with useCallback
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
