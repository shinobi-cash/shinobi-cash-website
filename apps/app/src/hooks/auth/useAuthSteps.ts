import type { KeyGenerationResult } from "@shinobi-cash/core";
import { useState, useCallback, useRef, useEffect } from "react";

export type AuthStep =
  | "choose"
  | "login-method"
  | "login-convenient"
  | "login-backup"
  | "create-keys"
  | "create-backup"
  | "setup-convenient"
  | "syncing-notes";

interface UseAuthStepsOptions {
  onAuthComplete?: () => void;
  actionContext?: {
    type: "deposit" | "my-notes" | "general";
    onNavigateToAction?: () => void;
  };
}

export function useAuthSteps(options: UseAuthStepsOptions = {}) {
  const [currentStep, setCurrentStep] = useState<AuthStep>("choose");
  const [generatedKeys, setGeneratedKeys] = useState<KeyGenerationResult | null>(null);
  const [loginKey, setLoginKey] = useState<KeyGenerationResult | null>(null);

  // Use ref for callback to avoid including it in dependencies
  const onAuthCompleteRef = useRef(options.onAuthComplete);
  useEffect(() => {
    onAuthCompleteRef.current = options.onAuthComplete;
  }, [options.onAuthComplete]);

  const resetState = useCallback(() => {
    setCurrentStep("choose");
    setGeneratedKeys(null);
    setLoginKey(null);
  }, []);

  const canGoBack = useCallback(() => {
    return [
      "login-method",
      "login-convenient",
      "login-backup",
      "create-keys",
      "create-backup",
      "setup-convenient",
    ].includes(currentStep);
  }, [currentStep]);

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case "login-method":
      case "create-keys":
        setCurrentStep("choose");
        break;
      case "login-convenient":
      case "login-backup":
        setCurrentStep("login-method");
        break;
      case "create-backup":
        setCurrentStep("create-keys");
        break;
      case "setup-convenient":
        if (loginKey) {
          setCurrentStep("login-backup");
        } else {
          // For wallet signature auth, go back to key generation (skip backup)
          setCurrentStep("create-keys");
        }
        break;
    }
  }, [currentStep, loginKey]);

  // Step handlers
  const handleLoginChoice = useCallback(() => setCurrentStep("login-method"), []);
  const handleCreateChoice = useCallback(() => setCurrentStep("create-keys"), []);

  const handleLoginMethodChoice = useCallback((method: "convenient" | "backup") => {
    setCurrentStep(method === "convenient" ? "login-convenient" : "login-backup");
  }, []);

  const handleKeyGenerationComplete = useCallback((keys: KeyGenerationResult) => {
    setGeneratedKeys(keys);
    // Skip backup step for wallet signature-based auth (keys are recoverable by re-signing)
    setCurrentStep("setup-convenient");
  }, []);

  const handleBackupComplete = useCallback(() => {
    setCurrentStep("setup-convenient");
  }, []);

  const handleRecoveryComplete = useCallback((keys: KeyGenerationResult) => {
    setLoginKey(keys);
    setCurrentStep("setup-convenient");
  }, []);

  const handleAccountSetupComplete = useCallback(() => {
    // Always go to syncing step for consistent UX and "Welcome to Shinobi!" experience
    setCurrentStep("syncing-notes");
  }, []);

  const handleSyncingComplete = useCallback(() => {
    resetState();
    onAuthCompleteRef.current?.();
  }, [resetState]);

  return {
    currentStep,
    generatedKeys,
    loginKey,
    resetState,
    canGoBack,
    handleBack,
    handleLoginChoice,
    handleCreateChoice,
    handleLoginMethodChoice,
    handleKeyGenerationComplete,
    handleBackupComplete,
    handleRecoveryComplete,
    handleAccountSetupComplete,
    handleSyncingComplete,
    actionContext: options.actionContext,
  };
}
