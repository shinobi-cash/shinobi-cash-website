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
    if (!authSteps.currentStep) return "Loading...";

    switch (authSteps.currentStep) {
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
    if (!authSteps.currentStep) return "Checking for existing local accounts...";

    switch (authSteps.currentStep) {
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

  // Footer actions registration
  type FooterAction = {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
    disabled?: boolean;
    icon?: React.ReactNode;
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

  const canGoBack = authSteps.canGoBack();
  const isFirstStep = authSteps.currentStep === "login-convenient" || authSteps.currentStep === "create-keys";

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
        {authSteps.currentStep && (
          <AuthStepContent
            currentStep={authSteps.currentStep}
            generatedKeys={authSteps.generatedKeys}
            encryptionKey={authSteps.encryptionKey}
            walletAddress={authSteps.walletAddress}
            hasExistingAccounts={authSteps.hasExistingAccounts ?? false}
            hasPasskeyAccounts={authSteps.hasPasskeyAccounts}
            onLoginChoice={authSteps.handleLoginChoice}
            onCreateChoice={authSteps.handleCreateChoice}
            onKeyGenerationComplete={authSteps.handleKeyGenerationComplete}
            onAccountSetupComplete={authSteps.handleAccountSetupComplete}
            onSkipSetup={authSteps.handleSkipSetup}
            onSyncingComplete={authSteps.handleSyncingComplete}
            registerFooterActions={registerFooterActions}
          />
        )}
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
                <span className="w-full text-center leading-tight flex items-center justify-center gap-2">
                  {footerSecondary?.icon}
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
                <span className="w-full text-center leading-tight flex items-center justify-center gap-2">
                  {footerPrimary.icon}
                  {footerPrimary.label}
                </span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
