import type { AuthStep } from "@/hooks/auth/useAuthSteps";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { AccountLoginForm } from "./AccountLoginForm";
import AccountSetupForm from "./AccountSetupForm";
import { BackupMnemonicSection } from "./BackupMnemonicSection";
import { KeyGenerationSection } from "./KeyGenerationSection";
import { WalletSignatureKeyGeneration } from "./WalletSignatureKeyGeneration";
import { LoginWithBackupPhrase } from "./LoginWithBackupPhrase";
import { SyncingNotesSection } from "./SyncingNotesSection";

interface AuthStepContentProps {
  currentStep: AuthStep;
  generatedKeys: KeyGenerationResult | null;
  loginKey: KeyGenerationResult | null;
  onLoginChoice: () => void;
  onCreateChoice: () => void;
  onLoginMethodChoice: (method: "convenient" | "backup") => void;
  onKeyGenerationComplete: (keys: KeyGenerationResult) => void;
  onBackupComplete: () => void;
  onRecoveryComplete: (keys: KeyGenerationResult) => void;
  onAccountSetupComplete: () => void;
  onSyncingComplete: () => void;
  registerFooterActions?: (
    primary: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
  ) => void;
}

export function AuthStepContent({
  currentStep,
  generatedKeys,
  loginKey,
  onLoginChoice: _onLoginChoice,
  onCreateChoice: _onCreateChoice,
  onLoginMethodChoice: _onLoginMethodChoice,
  onKeyGenerationComplete,
  onBackupComplete,
  onRecoveryComplete,
  onAccountSetupComplete,
  onSyncingComplete,
  registerFooterActions,
}: AuthStepContentProps) {
  switch (currentStep) {
    case "choose":
      return (
        <div className="text-center">
          <p className="text-sm text-app-secondary">Your data is kept locally and encrypted.</p>
        </div>
      );

    case "login-method":
      return (
        <div className="text-center">
          <p className="text-sm text-app-secondary">We don't upload your login data or keys.</p>
        </div>
      );

    case "login-convenient":
      return <AccountLoginForm onSuccess={onAccountSetupComplete} registerFooterActions={registerFooterActions} />;

    case "login-backup":
      return (
        <LoginWithBackupPhrase onRecoverAccountKey={onRecoveryComplete} registerFooterActions={registerFooterActions} />
      );

    case "create-keys":
      return (
        <WalletSignatureKeyGeneration
          onKeyGenerationComplete={onKeyGenerationComplete}
          registerFooterActions={registerFooterActions}
        />
      );

    case "create-backup":
      return (
        <BackupMnemonicSection
          generatedKeys={generatedKeys}
          onBackupMnemonicComplete={onBackupComplete}
          registerFooterActions={registerFooterActions}
        />
      );

    case "setup-convenient":
      return (
        <AccountSetupForm
          generatedKeys={generatedKeys || loginKey}
          onAccountSetupComplete={onAccountSetupComplete}
          registerFooterActions={registerFooterActions}
        />
      );

    case "syncing-notes":
      return <SyncingNotesSection onSyncComplete={onSyncingComplete} registerFooterActions={registerFooterActions} />;

    default:
      return null;
  }
}
