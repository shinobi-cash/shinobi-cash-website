import type { AuthStep } from "@/hooks/auth/useAuthSteps";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { AccountLoginForm } from "./AccountLoginForm";
import AccountSetupForm from "./AccountSetupForm";
import { WalletSignatureKeyGeneration } from "./WalletSignatureKeyGeneration";
import { SyncingNotesSection } from "./SyncingNotesSection";

interface AuthStepContentProps {
  currentStep: AuthStep;
  generatedKeys: KeyGenerationResult | null;
  encryptionKey: Uint8Array | null;
  walletAddress: string | null;
  hasExistingAccounts: boolean;
  hasPasskeyAccounts: boolean;
  onLoginChoice: () => void;
  onCreateChoice: () => void;
  onKeyGenerationComplete: (data: {
    keys: KeyGenerationResult;
    encryptionKey: Uint8Array;
    walletAddress: string;
  }) => void;
  onAccountSetupComplete: () => void;
  onSkipSetup: () => void;
  onSyncingComplete: () => void;
  registerFooterActions?: (
    primary: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
      icon?: React.ReactNode;
    } | null,
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
      icon?: React.ReactNode;
    } | null,
  ) => void;
}

export function AuthStepContent({
  currentStep,
  generatedKeys,
  encryptionKey,
  walletAddress,
  hasExistingAccounts,
  hasPasskeyAccounts,
  onLoginChoice,
  onCreateChoice,
  onKeyGenerationComplete,
  onAccountSetupComplete,
  onSkipSetup,
  onSyncingComplete,
  registerFooterActions,
}: AuthStepContentProps) {
  switch (currentStep) {
    case "login-convenient":
      return (
        <AccountLoginForm
          onSuccess={onAccountSetupComplete}
          onCreateAccount={onCreateChoice}
          onKeyGenerationComplete={onKeyGenerationComplete}
          hasPasskeyAccounts={hasPasskeyAccounts}
          registerFooterActions={registerFooterActions}
        />
      );

    case "create-keys":
      return (
        <WalletSignatureKeyGeneration
          onKeyGenerationComplete={onKeyGenerationComplete}
          onLoginChoice={hasExistingAccounts ? onLoginChoice : undefined}
          registerFooterActions={registerFooterActions}
        />
      );

    case "setup-convenient":
      return (
        <AccountSetupForm
          generatedKeys={generatedKeys}
          encryptionKey={encryptionKey}
          walletAddress={walletAddress}
          onAccountSetupComplete={onAccountSetupComplete}
          onSkip={onSkipSetup}
          hasExistingAccounts={hasExistingAccounts}
          onLoginChoice={onLoginChoice}
          registerFooterActions={registerFooterActions}
        />
      );

    case "syncing-notes":
      return <SyncingNotesSection onSyncComplete={onSyncingComplete} registerFooterActions={registerFooterActions} />;

    default:
      return null;
  }
}
