/**
 * Auth Flow Controller
 * Main orchestrator for the multi-step authentication flow
 * Coordinates all child hooks and owns the state machine
 *
 * ARCHITECTURE: This is the ONLY place that calls authController.authenticate()
 * Components emit events, this controller reacts
 *
 * @file features/auth/controller/useAuthFlowController.ts
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { isPasskeySupported } from "@/utils/environment";
import { useAuthController } from "./useAuthController";
import { showToast } from "@/lib/toast";
import type { AuthStep, AuthStatus } from "../types";
import type { AuthError } from "@/lib/errors/AuthError";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { listAccounts, listPasskeyAccounts } from "../session/sessionManagement";

// ============ TYPES ============

export interface AuthFlowController {
  // State
  status: AuthStatus;
  currentStep: AuthStep | null;
  lastError: AuthError | null;

  // Account state
  hasExistingAccounts: boolean | null;
  hasPasskeyAccounts: boolean;
  passkeySupported: boolean;

  // Generated data (from key generation step)
  generatedKeys: KeyGenerationResult | null;
  encryptionKey: Uint8Array | null;
  walletAddress: string | null;

  // Navigation
  canGoBack: boolean;

  // Actions
  handleLoginChoice: () => void;
  handleCreateChoice: () => void;

  // Login success handlers (components emit, controller authenticates)
  handlePasskeyLoginSuccess: (keys: KeyGenerationResult) => void;
  handleWalletLoginSuccess: (keys: KeyGenerationResult) => void;

  handleKeyGenerationComplete: (data: {
    keys: KeyGenerationResult;
    encryptionKey: Uint8Array;
    walletAddress: string;
  }) => void;
  handleAccountSetupComplete: () => void;
  handleSkipSetup: () => void;
  handleSyncingComplete: () => void;
  handleBack: () => void;
  resetFlow: () => void;
}

interface AuthFlowOptions {
  onAuthComplete?: () => void;
}

// ============ CONTROLLER ============

export function useAuthFlowController(options: AuthFlowOptions = {}): AuthFlowController {
  // ============ DEPENDENCIES ============

  const authController = useAuthController();

  // ============ STATE ============

  const [hasExistingAccounts, setHasExistingAccounts] = useState<boolean | null>(null);
  const [hasPasskeyAccounts, setHasPasskeyAccounts] = useState<boolean>(false);
  const [passkeySupported, setPasskeySupported] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<AuthStep | null>(null);
  const [generatedKeys, setGeneratedKeys] = useState<KeyGenerationResult | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [lastError, setLastError] = useState<AuthError | null>(null);

  // ============ INITIALIZATION ============

  // Guard to ensure account check runs exactly once
  const initializedRef = useRef(false);

  // Check for existing accounts on mount (gated by session restore)
  useEffect(() => {
    // Wait for session restore to complete before checking accounts
    if (authController.isRestoring) return;

    // Guard: ensure this runs exactly once (even in React Strict Mode)
    if (initializedRef.current) return;
    initializedRef.current = true;

    const checkExistingAccounts = async () => {
      try {
        // Check if passkey is supported
        const supported = isPasskeySupported();
        setPasskeySupported(supported);

        // Get all accounts
        const accounts = await listAccounts();
        const hasAccounts = accounts.length > 0;
        setHasExistingAccounts(hasAccounts);

        // Check if there are any passkey-based accounts (efficient with discriminated union)
        let hasPasskeys = false;
        if (supported && hasAccounts) {
          const passkeyAccounts = await listPasskeyAccounts();
          hasPasskeys = passkeyAccounts.length > 0;
        }
        setHasPasskeyAccounts(hasPasskeys);

        // Set initial step
        setCurrentStep(hasAccounts ? "login-convenient" : "create-keys");
      } catch (error) {
        console.error("Failed to check existing accounts:", error);
        // Default to create flow if check fails
        setHasExistingAccounts(false);
        setHasPasskeyAccounts(false);
        setCurrentStep("create-keys");
      }
    };

    checkExistingAccounts();
  }, [authController.isRestoring]);

  // Short-circuit flow if already authenticated (prevents UI flicker)
  useEffect(() => {
    if (authController.isAuthenticated) {
      setCurrentStep(null);
    }
  }, [authController.isAuthenticated]);

  // ============ DERIVED STATE ============

  // Status state machine (with session restore awareness)
  const status: AuthStatus = useMemo(() => {
    if (authController.isRestoring) return "checking-accounts";
    if (currentStep === null) return "checking-accounts";
    if (lastError) return "error";
    if (currentStep === "syncing-notes") return "syncing";
    return "ready";
  }, [authController.isRestoring, currentStep, lastError]);

  // Can go back from setup step
  const canGoBack = useMemo(() => {
    return currentStep === "setup-convenient";
  }, [currentStep]);

  // ============ ACTIONS ============

  /**
   * Reset flow to initial state
   */
  const resetFlow = useCallback(() => {
    setCurrentStep(hasExistingAccounts ? "login-convenient" : "create-keys");
    setGeneratedKeys(null);
    setEncryptionKey(null);
    setWalletAddress(null);
    setLastError(null);
  }, [hasExistingAccounts]);

  /**
   * Navigate to login step
   */
  const handleLoginChoice = useCallback(() => {
    setCurrentStep("login-convenient");
    setLastError(null);
  }, []);

  /**
   * Navigate to create keys step
   */
  const handleCreateChoice = useCallback(() => {
    setCurrentStep("create-keys");
    setLastError(null);
  }, []);

  /**
   * Handle successful passkey login
   * ARCHITECTURE: Central point for all authentication
   */
  const handlePasskeyLoginSuccess = useCallback(
    (keys: KeyGenerationResult) => {
      authController.authenticate(keys);
      showToast.auth.success("Passkey login");
      setCurrentStep("syncing-notes");
    },
    [authController]
  );

  /**
   * Handle successful wallet login
   * ARCHITECTURE: Central point for all authentication
   */
  const handleWalletLoginSuccess = useCallback(
    (keys: KeyGenerationResult) => {
      authController.authenticate(keys);
      showToast.auth.success("Wallet login");
      setCurrentStep("syncing-notes");
    },
    [authController]
  );

  /**
   * Handle successful key generation
   */
  const handleKeyGenerationComplete = useCallback(
    async (data: {
      keys: KeyGenerationResult;
      encryptionKey: Uint8Array;
      walletAddress: string;
    }) => {
      setGeneratedKeys(data.keys);
      setEncryptionKey(data.encryptionKey);
      setWalletAddress(data.walletAddress);

      // Skip passkey setup if device doesn't support it
      if (!passkeySupported) {
        // Will handle wallet-only setup in the component
        setCurrentStep("syncing-notes");
      } else {
        setCurrentStep("setup-convenient");
      }
    },
    [passkeySupported]
  );

  /**
   * Handle successful account setup (passkey created)
   */
  const handleAccountSetupComplete = useCallback(() => {
    setCurrentStep("syncing-notes");
  }, []);

  /**
   * Skip passkey setup (wallet-only account)
   * ARCHITECTURE: Central point for authentication
   */
  const handleSkipSetup = useCallback(() => {
    // Authenticate with generated keys
    if (generatedKeys) {
      authController.authenticate(generatedKeys);
    }

    // Complete auth flow immediately for temporary sessions
    resetFlow();
    options.onAuthComplete?.();
  }, [generatedKeys, authController, resetFlow, options]);

  /**
   * Handle syncing complete
   */
  const handleSyncingComplete = useCallback(() => {
    resetFlow();
    options.onAuthComplete?.();
  }, [resetFlow, options]);

  /**
   * Go back one step
   */
  const handleBack = useCallback(() => {
    if (currentStep === "setup-convenient") {
      setCurrentStep("create-keys");
    }
  }, [currentStep]);

  // ============ RETURN CONTROLLER ============

  return {
    // State
    status,
    currentStep,
    lastError,

    // Account state
    hasExistingAccounts,
    hasPasskeyAccounts,
    passkeySupported,

    // Generated data
    generatedKeys,
    encryptionKey,
    walletAddress,

    // Navigation
    canGoBack,

    // Actions
    handleLoginChoice,
    handleCreateChoice,
    handlePasskeyLoginSuccess,
    handleWalletLoginSuccess,
    handleKeyGenerationComplete,
    handleAccountSetupComplete,
    handleSkipSetup,
    handleSyncingComplete,
    handleBack,
    resetFlow,
  };
}
