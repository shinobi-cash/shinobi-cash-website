/**
 * Auth Screen Component
 */

import { useAuth } from "@/contexts/AuthContext";
import { useAuthSteps } from "@/hooks/auth/useAuthSteps";
import { isPasskeySupported } from "@/utils/environment";
import { useCallback, useEffect, useState } from "react";
import { AuthStepContent } from "../features/auth/AuthStepContent";
import { Button } from "../ui/button";
import { BackButton } from "../ui/back-button";

interface AuthScreenProps {
  onAuthComplete?: () => void;
  onBack?: () => void;
}

export function AuthScreen({ onAuthComplete, onBack }: AuthScreenProps) {
  const shouldShowPasskey = isPasskeySupported();
  const { isAuthenticated } = useAuth();

  // Memoize the callback to prevent infinite loops
  const handleAuthComplete = useCallback(() => {
    onAuthComplete?.();
  }, [onAuthComplete]);

  // Use shared auth steps logic
  const authSteps = useAuthSteps({
    onAuthComplete: handleAuthComplete,
  });

  // Auto-close when authenticated
  useEffect(() => {
    if (isAuthenticated && authSteps.currentStep !== "syncing-notes") {
      setTimeout(() => {
        onAuthComplete?.();
      }, 500);
    }
  }, [isAuthenticated, authSteps.currentStep, onAuthComplete]);

  const getTitle = () => {
    switch (authSteps.currentStep) {
      case "choose":
        return "Get Started";
      case "login-method":
        return "Sign in";
      case "login-convenient":
        return "Sign in";
      case "login-backup":
        return "Recover with phrase";
      case "create-keys":
        return "Creating your secure identity";
      case "create-backup":
        return "Save your recovery phrase";
      case "setup-convenient":
        return shouldShowPasskey ? "Set up quick sign‑in" : "Create a password";
      case "syncing-notes":
        return "Syncing notes";
      default:
        return "Get Started";
    }
  };

  const getDescription = () => {
    switch (authSteps.currentStep) {
      case "choose":
        return "Sign in to continue. Your identity is created and stored on this device; we never send your keys to a server.";
      case "login-method":
        return "Choose how to log in. Credentials are encrypted and stored locally.";
      case "login-convenient":
        return "Use your credentials to continue. They never leave your device.";
      case "login-backup":
        return "Enter your 12‑word recovery phrase to restore your local keys.";
      case "create-keys":
        return "Sign a message with your wallet to generate your account keys. This is free and won't send any transactions.";
      case "create-backup":
        return "Write these 12 words down. They can restore your encrypted keys on any device.";
      case "setup-convenient":
        return shouldShowPasskey
          ? "Enable passkey stored in your device's secure enclave."
          : "Create a password to encrypt your local account data.";
      case "syncing-notes":
        return "Securely discovering your deposits using your local keys.";
      default:
        return "";
    }
  };

  // Footer actions registration
  type FooterAction = {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
    disabled?: boolean;
  };

  const [footerPrimary, setFooterPrimary] = useState<FooterAction | null>(null);
  const [footerSecondary, setFooterSecondary] = useState<FooterAction | null>(null);

  const resetFooter = useCallback(() => {
    setFooterPrimary(null);
    setFooterSecondary(null);
  }, []);

  useEffect(() => {
    resetFooter();
  }, [authSteps.currentStep, resetFooter]);

  const registerFooterActions = useCallback((primary: FooterAction | null, secondary?: FooterAction | null) => {
    setFooterPrimary(primary);
    setFooterSecondary(secondary ?? null);
  }, []);

  // Default footer actions for choose and login-method steps
  useEffect(() => {
    if (authSteps.currentStep === "choose") {
      registerFooterActions(
        { label: "Log in", onClick: authSteps.handleLoginChoice, variant: "default" },
        { label: "Create account", onClick: authSteps.handleCreateChoice, variant: "outline" },
      );
    } else if (authSteps.currentStep === "login-method") {
      const primaryLabel = shouldShowPasskey ? "Use passkey" : "Use password";
      registerFooterActions(
        { label: primaryLabel, onClick: () => authSteps.handleLoginMethodChoice("convenient"), variant: "default" },
        { label: "Use recovery phrase", onClick: () => authSteps.handleLoginMethodChoice("backup"), variant: "outline" },
      );
    }
  }, [
    authSteps.currentStep,
    shouldShowPasskey,
    registerFooterActions,
    authSteps.handleLoginChoice,
    authSteps.handleCreateChoice,
    authSteps.handleLoginMethodChoice,
  ]);

  const canGoBack = authSteps.canGoBack();
  const isFirstStep = authSteps.currentStep === "choose";

  const handleBack = () => {
    if (canGoBack) {
      authSteps.handleBack();
    } else if (onBack && !isFirstStep) {
      onBack();
    }
  };

  const shouldShowFooter = () => !!footerPrimary || !!footerSecondary || (canGoBack && !isFirstStep);

  return (
    <div className="flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        {canGoBack && !isFirstStep && <BackButton onClick={handleBack} />}
        <div>
          <h2 className="text-lg font-semibold text-white">{getTitle()}</h2>
          <p className="text-xs text-gray-400">{getDescription()}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AuthStepContent
          currentStep={authSteps.currentStep}
          generatedKeys={authSteps.generatedKeys}
          loginKey={authSteps.loginKey}
          onLoginChoice={authSteps.handleLoginChoice}
          onCreateChoice={authSteps.handleCreateChoice}
          onLoginMethodChoice={authSteps.handleLoginMethodChoice}
          onKeyGenerationComplete={authSteps.handleKeyGenerationComplete}
          onBackupComplete={authSteps.handleBackupComplete}
          onRecoveryComplete={authSteps.handleRecoveryComplete}
          onAccountSetupComplete={authSteps.handleAccountSetupComplete}
          onSyncingComplete={authSteps.handleSyncingComplete}
          registerFooterActions={registerFooterActions}
        />
      </div>

      {/* Footer */}
      {shouldShowFooter() && (
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="grid grid-cols-2 gap-3 w-full">
            {(footerSecondary || (canGoBack && footerPrimary)) && (
              <Button
                variant={footerSecondary?.variant ?? "outline"}
                onClick={footerSecondary?.onClick ?? handleBack}
                disabled={footerSecondary?.disabled}
                className="col-span-1 w-full min-h-12 py-3 text-base font-medium rounded-2xl"
                size="lg"
              >
                <span className="w-full text-center leading-tight">
                  {footerSecondary?.label ?? "Back"}
                </span>
              </Button>
            )}
            {footerPrimary && (
              <Button
                variant={footerPrimary.variant ?? "default"}
                onClick={footerPrimary.onClick}
                disabled={footerPrimary.disabled}
                className={`${footerSecondary || (canGoBack && footerPrimary) ? "col-span-1" : "col-span-2"} w-full min-h-12 py-3 text-base font-medium rounded-2xl`}
                size="lg"
              >
                <span className="w-full text-center leading-tight">{footerPrimary.label}</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
