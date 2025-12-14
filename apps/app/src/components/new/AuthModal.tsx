/**
 * Simple Auth Modal for New Layout
 * Handles authentication without NavigationContext dependency
 */

import { useAuth } from "@/contexts/AuthContext";
import { useAuthSteps } from "@/hooks/auth/useAuthSteps";
import { isPasskeySupported } from "@/utils/environment";
import { useCallback, useEffect, useState } from "react";
import { ResponsiveModal } from "../ui/responsive-modal";
import { AuthStepContent } from "../features/auth/AuthStepContent";
import { Button } from "../ui/button";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthComplete?: () => void;
}

export function AuthModal({ open, onOpenChange, onAuthComplete }: AuthModalProps) {
  const shouldShowPasskey = isPasskeySupported();
  const { isAuthenticated } = useAuth();

  // Memoize the callback to prevent infinite loops
  const handleAuthComplete = useCallback(() => {
    onOpenChange(false);
    onAuthComplete?.();
  }, [onOpenChange, onAuthComplete]);

  // Use shared auth steps logic
  const authSteps = useAuthSteps({
    onAuthComplete: handleAuthComplete,
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      authSteps.resetState();
    }
  }, [open, authSteps.resetState]); // Only depend on the function, not the whole object

  // Auto-close when authenticated
  useEffect(() => {
    if (isAuthenticated && open && authSteps.currentStep !== "syncing-notes") {
      // Let syncing complete before closing
      if (authSteps.currentStep === "syncing-notes") {
        return;
      }
      setTimeout(() => {
        onOpenChange(false);
        onAuthComplete?.();
      }, 500);
    }
  }, [isAuthenticated, open, authSteps.currentStep, onOpenChange, onAuthComplete]);

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
        return "Choose how to sign in. Credentials are stored locally and encrypted.";
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

  const shouldShowFooter = () => !!footerPrimary || !!footerSecondary || canGoBack;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={getTitle()}
      description={getDescription()}
      showBackButton={false}
      onBack={undefined}
      showFooter={shouldShowFooter()}
      footerContent={
        (footerPrimary || footerSecondary || canGoBack) && (
          <div className="grid grid-cols-2 gap-3 w-full">
            {(footerSecondary || canGoBack) && (
              <Button
                variant={canGoBack && !footerSecondary ? "outline" : (footerSecondary?.variant ?? "outline")}
                onClick={canGoBack && !footerSecondary ? authSteps.handleBack : footerSecondary?.onClick}
                disabled={footerSecondary?.disabled}
                className="col-span-1 w-full min-h-12 py-3 text-base font-medium rounded-2xl"
                size="lg"
              >
                <span className="w-full text-center leading-tight">
                  {canGoBack && !footerSecondary ? "Back" : footerSecondary?.label}
                </span>
              </Button>
            )}
            {footerPrimary && (
              <Button
                variant={footerPrimary.variant ?? "default"}
                onClick={footerPrimary.onClick}
                disabled={footerPrimary.disabled}
                className={`${footerSecondary || canGoBack ? "col-span-1" : "col-span-2"} w-full min-h-12 py-3 text-base font-medium rounded-2xl`}
                size="lg"
              >
                <span className="w-full text-center leading-tight">{footerPrimary.label}</span>
              </Button>
            )}
          </div>
        )
      }
    >
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
    </ResponsiveModal>
  );
}
