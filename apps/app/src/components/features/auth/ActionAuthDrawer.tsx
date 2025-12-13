/**
 * Action Auth Drawer
 * Handles complete end-to-end authentication flow for pool actions
 * Guides users through auth and wallet connection based on the specific action context
 */

import { useAuth } from "@/contexts/AuthContext";
import { type Asset, useNavigation } from "@/contexts/NavigationContext";
import { useAuthSteps } from "@/hooks/auth/useAuthSteps";
import { isPasskeySupported } from "@/utils/environment";
import { modal } from "@/context";
import { Loader2, WalletIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "../../ui/button";
import { ResponsiveModal } from "../../ui/responsive-modal";
import { AuthStepContent } from "../auth/AuthStepContent";

type ActionStep = "auth" | "wallet" | "complete";

type ActionType = "deposit" | "my-notes";

interface ActionAuthDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionType;
  asset: Asset;
}

export function ActionAuthDrawer({ open, onOpenChange, action, asset }: ActionAuthDrawerProps) {
  const [currentActionStep, setCurrentActionStep] = useState<ActionStep>("auth");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const shouldShowPasskey = isPasskeySupported();

  const { isAuthenticated } = useAuth();
  const { isConnected } = useAccount();
  const { navigateToScreen } = useNavigation();

  // Use shared auth steps logic
  const authSteps = useAuthSteps({
    onAuthComplete: () => {
      // When auth completes, check if wallet is needed
      if (action === "deposit" && !isConnected) {
        setCurrentActionStep("wallet");
      } else {
        setCurrentActionStep("complete");
      }
    },
    // Pass action context for better completion UX
    actionContext: {
      type: action,
      onNavigateToAction: () => {
        onOpenChange(false);
        navigateToScreen(getTargetScreen(action), asset);
      },
    },
  });

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setCurrentActionStep("auth");
      authSteps.resetState();
    }
  }, [open, authSteps.resetState]); // Only depend on the function, not the whole object

  // Auto-progress when authentication or wallet requirements are met
  useEffect(() => {
    if (!open) return;

    if (isAuthenticated && currentActionStep === "auth") {
      // Auth complete, but don't auto-advance if we're in syncing-notes step
      // Let the sync component handle its own completion
      if (authSteps.currentStep === "syncing-notes") {
        // Stay in auth step to let sync component show and complete
        return;
      }

      // For other completed auth steps, check if wallet is needed
      if (action === "deposit" && !isConnected) {
        setCurrentActionStep("wallet");
      } else {
        setCurrentActionStep("complete");
      }
    } else if (action === "deposit" && isAuthenticated && isConnected && currentActionStep === "wallet") {
      // Wallet connected during wallet step, move to complete
      setCurrentActionStep("complete");
    }

    if (currentActionStep === "complete") {
      // All steps complete, navigate to target screen
      onOpenChange(false);
      navigateToScreen(getTargetScreen(action), asset);
    }
  }, [
    open,
    isAuthenticated,
    isConnected,
    currentActionStep,
    action,
    asset,
    navigateToScreen,
    onOpenChange,
    authSteps.currentStep,
  ]);

  const getTargetScreen = (actionType: ActionType): "deposit" | "my-notes" => {
    return actionType;
  };

  const canGoBack = () => {
    if (currentActionStep === "wallet") return true;
    return currentActionStep === "auth" && authSteps.canGoBack();
  };

  const handleBack = () => {
    if (currentActionStep === "wallet") {
      setCurrentActionStep("auth");
    } else if (currentActionStep === "auth") {
      authSteps.handleBack();
    }
  };

  const handleConnectWallet = () => {
    setIsWalletModalOpen(true);
    modal.open();
  };

  // Reset wallet modal state when connection changes
  useEffect(() => {
    if (isConnected && isWalletModalOpen) {
      setIsWalletModalOpen(false);
    }
  }, [isConnected, isWalletModalOpen]);

  const getActionTitle = () => {
    switch (action) {
      case "deposit":
        return `Deposit ${asset.symbol}`;
      case "my-notes":
        return "My Notes";
      default:
        return "Get Started";
    }
  };

  const getTitle = () => {
    if (currentActionStep === "wallet") {
      return "Connect Wallet";
    }

    // For auth step, use context-aware titles
    switch (authSteps.currentStep) {
      case "choose":
        return getActionTitle();
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
        return getActionTitle();
    }
  };

  const getDescription = () => {
    if (currentActionStep === "wallet") {
      return "Connect your wallet to fund privacy pool deposits";
    }

    // For auth step, use context-aware descriptions
    switch (authSteps.currentStep) {
      case "choose":
        return "Sign in to continue. Your identity is created and stored on this device; we never send your keys to a server.";
      case "login-method":
        return "Choose how to sign in. Credentials are stored locally and encrypted. We don’t upload your login data or keys.";
      case "login-convenient":
        return "Use your credentials to continue. They never leave your device.";
      case "login-backup":
        return "Enter your 12‑word recovery phrase to restore your local keys. The phrase is processed only on this device.";
      case "create-keys":
        return "Generating keys on your device and encrypting them. This takes a few seconds. Keys never leave your device.";
      case "create-backup":
        return "Write these 12 words down. They can restore your encrypted keys on any device. They’re not uploaded.";
      case "setup-convenient":
        return shouldShowPasskey
          ? "Enable passkey stored in your device’s secure enclave. Your keys remain local and encrypted."
          : "Create a password to encrypt your local account data for faster sign‑in. We never upload your password.";
      case "syncing-notes":
        return "Securely discovering your deposits using your local keys. Nothing sensitive leaves your device.";
      default:
        return "";
    }
  };

  // Footer actions registration API
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
    // Clear when step changes; content will re-register
    resetFooter();
    // reference current step to satisfy dependency usage
    const step = authSteps.currentStep;
    void step;
  }, [authSteps.currentStep, resetFooter]);

  const registerFooterActions = useCallback((primary: FooterAction | null, secondary?: FooterAction | null) => {
    setFooterPrimary(primary);
    setFooterSecondary(secondary ?? null);
  }, []);

  const renderStepContent = () => {
    if (currentActionStep === "auth") {
      return (
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
      );
    }

    if (currentActionStep === "wallet") {
      return null; // Content will be in footer
    }

    return null;
  };

  // Default footer actions for steps that don't require component state
  useEffect(() => {
    if (currentActionStep !== "auth") return;

    if (authSteps.currentStep === "choose") {
      const nextPrimary = { label: "Log in", variant: "default" as const };
      const nextSecondary = { label: "Create account", variant: "outline" as const };

      const needsUpdate =
        footerPrimary?.label !== nextPrimary.label ||
        (footerPrimary?.variant ?? "default") !== nextPrimary.variant ||
        footerSecondary?.label !== nextSecondary.label ||
        (footerSecondary?.variant ?? "outline") !== nextSecondary.variant;

      if (needsUpdate) {
        registerFooterActions(
          { ...nextPrimary, onClick: authSteps.handleLoginChoice },
          { ...nextSecondary, onClick: authSteps.handleCreateChoice },
        );
      }
    } else if (authSteps.currentStep === "login-method") {
      const primaryLabel = shouldShowPasskey ? "Use passkey" : "Use password";
      const nextPrimary = { label: primaryLabel, variant: "default" as const };
      const nextSecondary = { label: "Use recovery phrase", variant: "outline" as const };

      const needsUpdate =
        footerPrimary?.label !== nextPrimary.label ||
        (footerPrimary?.variant ?? "default") !== nextPrimary.variant ||
        footerSecondary?.label !== nextSecondary.label ||
        (footerSecondary?.variant ?? "outline") !== nextSecondary.variant;

      if (needsUpdate) {
        registerFooterActions(
          { ...nextPrimary, onClick: () => authSteps.handleLoginMethodChoice("convenient") },
          { ...nextSecondary, onClick: () => authSteps.handleLoginMethodChoice("backup") },
        );
      }
    }
    // Other steps will have their components register actions dynamically
  }, [
    currentActionStep,
    authSteps.currentStep,
    shouldShowPasskey,
    registerFooterActions,
    authSteps.handleLoginChoice,
    authSteps.handleCreateChoice,
    authSteps.handleLoginMethodChoice,
    footerPrimary,
    footerSecondary,
  ]);

  const shouldShowFooter = () => !!footerPrimary || !!footerSecondary || currentActionStep === "wallet";

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={getTitle()}
      description={getDescription()}
      showBackButton={false}
      onBack={undefined}
      isWalletModalOpen={isWalletModalOpen}
      showFooter={shouldShowFooter()}
      footerContent={
        currentActionStep === "wallet" ? (
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleBack}
              className="col-span-1 w-full min-h-12 py-3 text-base font-medium rounded-2xl"
              size="lg"
            >
              <span className="w-full text-center leading-tight">Back</span>
            </Button>
            <Button
              variant="default"
              className="col-span-1 w-full min-h-12 py-3 text-base font-medium rounded-2xl justify-center gap-2"
              onClick={handleConnectWallet}
              disabled={isWalletModalOpen}
              size="lg"
            >
              {isWalletModalOpen ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-center leading-tight">Connecting…</span>
                </>
              ) : (
                <>
                  <WalletIcon className="w-5 h-5" />
                  <span className="text-center leading-tight">Connect Wallet</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          (footerPrimary || footerSecondary || canGoBack()) &&
          (() => {
            const explicitSecondary = footerSecondary;
            const backSecondary: FooterAction | null = canGoBack()
              ? { label: "Back", onClick: handleBack, variant: "outline" as const }
              : null;
            const threeActions = !!(footerPrimary && explicitSecondary && backSecondary);

            if (threeActions) {
              return (
                <div className="grid gap-3 w-full">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Back */}
                    <Button
                      variant="outline"
                      onClick={backSecondary?.onClick}
                      disabled={backSecondary?.disabled}
                      className="col-span-1 w-full min-h-12 py-3 text-base font-medium rounded-2xl"
                      size="lg"
                    >
                      <span className="w-full text-center leading-tight">{backSecondary?.label}</span>
                    </Button>
                    {/* Primary */}
                    <Button
                      variant={footerPrimary?.variant ?? "default"}
                      onClick={footerPrimary?.onClick}
                      disabled={footerPrimary?.disabled}
                      className="col-span-1 w-full min-h-12 py-3 text-base font-medium rounded-2xl"
                      size="lg"
                    >
                      <span className="w-full text-center leading-tight">{footerPrimary?.label}</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1">
                    {/* Explicit secondary full-width */}
                    <Button
                      variant={explicitSecondary?.variant ?? "outline"}
                      onClick={explicitSecondary?.onClick}
                      disabled={explicitSecondary?.disabled}
                      className="col-span-1 w-full min-h-12 py-3 text-base font-medium rounded-2xl"
                      size="lg"
                    >
                      <span className="w-full text-center leading-tight">{explicitSecondary?.label}</span>
                    </Button>
                  </div>
                </div>
              );
            }

            const secondary: FooterAction | null = explicitSecondary ?? backSecondary;
            const twoButtons = !!(secondary && footerPrimary);
            return (
              <div className={`grid ${twoButtons ? "grid-cols-2" : "grid-cols-2"} gap-3 w-full`}>
                {secondary && (
                  <Button
                    variant={backSecondary ? "outline" : (secondary.variant ?? "outline")}
                    onClick={secondary.onClick}
                    disabled={secondary.disabled}
                    className={`${twoButtons ? "col-span-1" : "col-span-2"} w-full min-h-12 py-3 text-base font-medium rounded-2xl`}
                    size="lg"
                  >
                    <span className="w-full text-center leading-tight">{secondary.label}</span>
                  </Button>
                )}
                {footerPrimary && (
                  <Button
                    variant={footerPrimary.variant ?? "default"}
                    onClick={footerPrimary.onClick}
                    disabled={footerPrimary.disabled}
                    className={`${twoButtons ? "col-span-1" : "col-span-2"} w-full min-h-12 py-3 text-base font-medium rounded-2xl`}
                    size="lg"
                  >
                    <span className="w-full text-center leading-tight">{footerPrimary.label}</span>
                  </Button>
                )}
              </div>
            );
          })()
        )
      }
    >
      {renderStepContent()}
    </ResponsiveModal>
  );
}
