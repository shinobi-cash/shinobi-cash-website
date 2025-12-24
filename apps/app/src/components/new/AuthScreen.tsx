/**
 * file: shinobi-cash-website/apps/app/src/components/new/AuthScreen.tsx
 * Auth Screen Component
 */

import { useAuthFlowController } from "@/features/auth/controller/useAuthFlowController";
import { useCallback, useEffect, useRef } from "react";
import { AuthStepContent } from "@/features/auth";
import { BackButton } from "../ui/back-button";

interface AuthScreenProps {
  onAuthComplete?: () => void;
  onBack?: () => void;
}

export function AuthScreen({ onAuthComplete, onBack }: AuthScreenProps) {
  // Use ref for callback to avoid including it in dependencies
  const onAuthCompleteRef = useRef(onAuthComplete);
  useEffect(() => {
    onAuthCompleteRef.current = onAuthComplete;
  }, [onAuthComplete]);

  // Memoize the callback to prevent infinite loops
  const handleAuthComplete = useCallback(() => {
    onAuthCompleteRef.current?.();
  }, []);

  // Use auth flow controller - single source of truth
  const flow = useAuthFlowController({
    onAuthComplete: handleAuthComplete,
  });

  // NOTE: Auth completion is handled by flow controller via handleSyncingComplete
  // No auto-close effect needed - prevents race condition during sync

  const getTitle = () => {
    if (!flow.currentStep) return "Loading...";

    switch (flow.currentStep) {
      case "login-convenient":
        return "Sign in";
      case "create-keys":
        return "Creating your secure identity";
      case "setup-convenient":
        return "Set up quick sign‑in with passkey";
      case "syncing-notes":
        return "Syncing notes";
      default:
        return "Get Started";
    }
  };

  const getDescription = () => {
    if (!flow.currentStep) return "Checking for existing local accounts...";

    switch (flow.currentStep) {
      case "login-convenient":
        return "Use your credentials to continue. They never leave your device.";
      case "create-keys":
        return "Sign a message with your wallet to generate your account keys. This is free and won't send any transactions.";
      case "setup-convenient":
        return "Enable passkey for quick sign-in, or skip to use wallet signature each time.";
      case "syncing-notes":
        return "Securely discovering your deposits using your local keys.";
      default:
        return "";
    }
  };

  const canGoBack = flow.canGoBack;
  const isFirstStep =
    flow.currentStep === "login-convenient" || flow.currentStep === "create-keys";

  const handleBack = () => {
    if (canGoBack) {
      flow.handleBack();
    } else if (onBack && !isFirstStep) {
      onBack();
    }
  };

  return (
    <div className="flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-4">
        {canGoBack && !isFirstStep && <BackButton onClick={handleBack} />}
        <div>
          <h2 className="text-lg font-semibold text-white">{getTitle()}</h2>
          <p className="text-xs text-gray-400">{getDescription()}</p>
        </div>
      </div>

      {/* Content with integrated footer - each step renders its own footer */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {flow.currentStep && (
          <AuthStepContent
            currentStep={flow.currentStep}
            generatedKeys={flow.generatedKeys}
            encryptionKey={flow.encryptionKey}
            walletAddress={flow.walletAddress}
            hasExistingAccounts={flow.hasExistingAccounts ?? false}
            hasPasskeyAccounts={flow.hasPasskeyAccounts}
            onLoginChoice={flow.handleLoginChoice}
            onCreateChoice={flow.handleCreateChoice}
            onPasskeyLoginSuccess={flow.handlePasskeyLoginSuccess}
            onWalletLoginSuccess={flow.handleWalletLoginSuccess}
            onKeyGenerationComplete={flow.handleKeyGenerationComplete}
            onAccountSetupComplete={flow.handleAccountSetupComplete}
            onSkipSetup={flow.handleSkipSetup}
            onSyncingComplete={flow.handleSyncingComplete}
          />
        )}
      </div>
    </div>
  );
}
