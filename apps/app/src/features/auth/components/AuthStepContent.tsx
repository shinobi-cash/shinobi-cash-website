/**
 * Auth Step Content
 * Router component for auth flow steps
 * @file features/auth/components/AuthStepContent.tsx
 */

import type { AuthStep } from "@/features/auth/types";
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

  // Login success handlers
  onPasskeyLoginSuccess: (keys: KeyGenerationResult) => void;
  onWalletLoginSuccess: (keys: KeyGenerationResult) => void;

  onKeyGenerationComplete: (data: {
    keys: KeyGenerationResult;
    encryptionKey: Uint8Array;
    walletAddress: string;
  }) => void;
  onAccountSetupComplete: () => void;
  onSkipSetup: () => void;
  onSyncingComplete: () => void;
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
  onPasskeyLoginSuccess,
  onWalletLoginSuccess,
  onKeyGenerationComplete,
  onAccountSetupComplete,
  onSkipSetup,
  onSyncingComplete,
}: AuthStepContentProps) {
  switch (currentStep) {
    case "login-convenient":
      return (
        <AccountLoginForm
          onPasskeyLoginSuccess={onPasskeyLoginSuccess}
          onWalletLoginSuccess={onWalletLoginSuccess}
          onNewWalletKeysGenerated={onKeyGenerationComplete}
          onCreateAccount={onCreateChoice}
          hasPasskeyAccounts={hasPasskeyAccounts}
        />
      );

    case "create-keys":
      return (
        <WalletSignatureKeyGeneration
          onKeyGenerationComplete={onKeyGenerationComplete}
          onLoginChoice={hasExistingAccounts ? onLoginChoice : undefined}
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
        />
      );

    case "syncing-notes":
      return <SyncingNotesSection onSyncComplete={onSyncingComplete} />;

    default:
      return null;
  }
}
