import type { KeyGenerationResult } from "@shinobi-cash/core";
import { useState, useCallback, useRef, useEffect } from "react";
import { storageManager } from "@/lib/storage";
import { isPasskeySupported } from "@/utils/environment";

export type AuthStep = "login-convenient" | "create-keys" | "setup-convenient" | "syncing-notes";

interface UseAuthStepsOptions {
  onAuthComplete?: () => void;
  actionContext?: {
    type: "deposit" | "my-notes" | "general";
    onNavigateToAction?: () => void;
  };
}

export function useAuthSteps(options: UseAuthStepsOptions = {}) {
  const [hasExistingAccounts, setHasExistingAccounts] = useState<boolean | null>(null);
  const [hasPasskeyAccounts, setHasPasskeyAccounts] = useState<boolean>(false);
  const [passkeySupported, setPasskeySupported] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<AuthStep | null>(null);
  const [generatedKeys, setGeneratedKeys] = useState<KeyGenerationResult | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Use ref for callback to avoid including it in dependencies
  const onAuthCompleteRef = useRef(options.onAuthComplete);
  useEffect(() => {
    onAuthCompleteRef.current = options.onAuthComplete;
  }, [options.onAuthComplete]);

  // Check for existing accounts on mount
  useEffect(() => {
    const checkExistingAccounts = async () => {
      try {
        // Check if passkey is supported
        const supported = isPasskeySupported();
        setPasskeySupported(supported);

        const accounts = await storageManager.listAccountNames();
        const hasAccounts = accounts.length > 0;
        setHasExistingAccounts(hasAccounts);

        // Check if there are any passkey-based accounts (not wallet-only)
        let hasPasskeys = false;
        if (supported && hasAccounts) {
          // Check if any accounts have passkey data
          for (const accountName of accounts) {
            const passkeyExists = await storageManager.passkeyExists(accountName);
            if (passkeyExists) {
              hasPasskeys = true;
              break;
            }
          }
        }
        setHasPasskeyAccounts(hasPasskeys);

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
  }, []);

  const resetState = useCallback(() => {
    setCurrentStep(hasExistingAccounts ? "login-convenient" : "create-keys");
    setGeneratedKeys(null);
    setEncryptionKey(null);
    setWalletAddress(null);
  }, [hasExistingAccounts]);

  const canGoBack = useCallback(() => {
    return currentStep === "setup-convenient";
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === "setup-convenient") {
      setCurrentStep("create-keys");
    }
  }, [currentStep]);

  // Step handlers
  const handleLoginChoice = useCallback(() => setCurrentStep("login-convenient"), []);
  const handleCreateChoice = useCallback(() => setCurrentStep("create-keys"), []);

  const handleKeyGenerationComplete = useCallback(
    async (data: {
      keys: KeyGenerationResult;
      encryptionKey: Uint8Array;
      walletAddress: string;
    }) => {
      setGeneratedKeys(data.keys);
      setEncryptionKey(data.encryptionKey);
      setWalletAddress(data.walletAddress);

      // Skip passkey setup if device doesn't support it - save directly to wallet-based storage
      if (!passkeySupported) {
        try {
          const accountId = data.walletAddress.toLowerCase();

          // Initialize storage with signature-derived encryption key
          await storageManager.initializeWalletAccountSession(accountId, data.encryptionKey);

          // Store account data encrypted with signature-derived key
          await storageManager.saveWalletAccountData({
            accountId,
            walletAddress: data.walletAddress,
            mnemonic: data.keys.mnemonic,
            publicKey: data.keys.publicKey,
          });

          // Go to syncing step
          setCurrentStep("syncing-notes");
        } catch (error) {
          console.error("Failed to save wallet account:", error);
          // Fall back to setup step on error
          setCurrentStep("setup-convenient");
        }
      } else {
        setCurrentStep("setup-convenient");
      }
    },
    [passkeySupported]
  );

  const handleAccountSetupComplete = useCallback(() => {
    // Always go to syncing step for consistent UX and "Welcome to Shinobi!" experience
    setCurrentStep("syncing-notes");
  }, []);

  const handleSkipSetup = useCallback(() => {
    // Skip syncing for temporary sessions (no persisted credentials)
    // Just complete the auth flow immediately
    resetState();
    onAuthCompleteRef.current?.();
  }, [resetState]);

  const handleSyncingComplete = useCallback(() => {
    resetState();
    onAuthCompleteRef.current?.();
  }, [resetState]);

  return {
    currentStep,
    generatedKeys,
    encryptionKey,
    walletAddress,
    hasExistingAccounts,
    hasPasskeyAccounts,
    passkeySupported,
    resetState,
    canGoBack,
    handleBack,
    handleLoginChoice,
    handleCreateChoice,
    handleKeyGenerationComplete,
    handleAccountSetupComplete,
    handleSkipSetup,
    handleSyncingComplete,
    actionContext: options.actionContext,
  };
}
