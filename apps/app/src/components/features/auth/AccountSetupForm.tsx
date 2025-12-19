/**
 * Account Setup Form
 * Passkey setup for convenient authentication
 * Handles account validation, passkey creation, and encrypted key storage
 */

import { useAuth } from "@/contexts/AuthContext";
import { useAccountNameValidation } from "@/hooks/useAccountNameValidation";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";
import { storageManager } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { AlertCircle, Fingerprint } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../../ui/input";
import { performPasskeySetup } from "./helpers/authFlows";

interface AccountSetupFormProps {
  generatedKeys: KeyGenerationResult | null;
  encryptionKey: Uint8Array | null;
  walletAddress: string | null;
  onAccountSetupComplete: () => void;
  onSkip?: () => void;
  hasExistingAccounts?: boolean;
  onLoginChoice?: () => void;
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

export default function AccountSetupForm({
  generatedKeys,
  encryptionKey,
  walletAddress,
  onAccountSetupComplete,
  onSkip,
  hasExistingAccounts,
  onLoginChoice,
  registerFooterActions,
}: AccountSetupFormProps) {
  return (
    <PasskeySetupForm
      generatedKeys={generatedKeys}
      encryptionKey={encryptionKey}
      walletAddress={walletAddress}
      onSuccess={onAccountSetupComplete}
      onSkip={onSkip}
      hasExistingAccounts={hasExistingAccounts}
      onLoginChoice={onLoginChoice}
      registerFooterActions={registerFooterActions}
    />
  );
}

// Passkey Setup Form Component
function PasskeySetupForm({
  generatedKeys,
  encryptionKey,
  walletAddress,
  onSuccess,
  onSkip,
  hasExistingAccounts,
  onLoginChoice,
  registerFooterActions,
}: {
  generatedKeys: KeyGenerationResult | null;
  encryptionKey: Uint8Array | null;
  walletAddress: string | null;
  onSuccess: () => void;
  onSkip?: () => void;
  hasExistingAccounts?: boolean;
  onLoginChoice?: () => void;
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
}) {
  const [accountName, setAccountName] = useState("");
  const { accountNameError, onAccountNameChange, setAccountNameError } = useAccountNameValidation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupError, setSetupError] = useState("");
  const { setKeys } = useAuth();
  const formRef = useRef<HTMLFormElement | null>(null);

  // Auto-focus on account name input when component mounts
  useEffect(() => {
    const input = document.getElementById("account-name") as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  const handlePasskeySetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accountNameError || !accountName.trim() || !generatedKeys) {
      return;
    }

    setIsProcessing(true);

    try {
      await performPasskeySetup(accountName, generatedKeys);

      // Set keys in auth context for immediate use
      setKeys(generatedKeys);

      // Optionally initialize sync baseline for new account
      if (generatedKeys.publicKey) {
        try {
          await storageManager.initializeSyncBaseline(generatedKeys.publicKey);
        } catch (error) {
          console.warn("Failed to initialize sync baseline:", error);
          // Non-fatal
        }
      }

      showToast.auth.success("Account created");
      onSuccess();
    } catch (error) {
      console.error("Passkey setup failed:", error);
      if (error instanceof AuthError) {
        if (error.code === AuthErrorCode.PASSKEY_PRF_UNSUPPORTED) {
          setSetupError("Device not supported - passkeys with PRF extension required");
        } else if (error.code === AuthErrorCode.ACCOUNT_ALREADY_EXISTS) {
          setSetupError("Passkey already exists for this account");
        } else if (error.code === AuthErrorCode.PASSKEY_CANCELLED) {
          setSetupError("Setup was cancelled. Please try again.");
        } else {
          setSetupError(error.message || "Passkey setup failed. Please try again.");
        }
      } else {
        setSetupError("Passkey setup failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = useCallback(async () => {
    if (!generatedKeys || !encryptionKey || !walletAddress || !onSkip) return;

    try {
      // Use wallet address as account identifier
      const accountId = walletAddress.toLowerCase();

      // Initialize storage with signature-derived encryption key
      await storageManager.initializeWalletAccountSession(accountId, encryptionKey);

      // Store account data encrypted with signature-derived key
      await storageManager.saveWalletAccountData({
        accountId,
        walletAddress,
        mnemonic: generatedKeys.mnemonic,
        publicKey: generatedKeys.publicKey,
      });

      // Set keys in context for this session
      setKeys(generatedKeys);

      // Complete setup and proceed to syncing
      onSkip();
    } catch (error) {
      console.error("Failed to initialize wallet account:", error);
      setSetupError("Failed to save account. Please try again.");
    }
  }, [generatedKeys, encryptionKey, walletAddress, onSkip, setKeys]);

  useEffect(() => {
    if (!registerFooterActions) return;
    const disabled = isProcessing || !!accountNameError || !accountName.trim() || !generatedKeys;
    registerFooterActions(
      {
        label: "Continue",
        onClick: () => {
          // Submit the form to reuse onSubmit validation/flow
          formRef.current?.requestSubmit();
        },
        disabled,
        icon: <Fingerprint className="h-5 w-5" />
      },
      onSkip ? {
        label: "Skip for now",
        onClick: handleSkip,
        variant: "ghost"
      } : null
    );
    return () => registerFooterActions(null);
  }, [registerFooterActions, isProcessing, accountNameError, accountName, generatedKeys, onSkip, handleSkip]);

  return (
    <form ref={formRef} onSubmit={handlePasskeySetup} className="space-y-2">
      <Input
        id="account-name"
        type="text"
        value={accountName}
        onChange={(e) => {
          setAccountName(e.target.value);
          if (accountNameError) setAccountNameError("");
          if (setupError) setSetupError("");

          // Debounce the validation to avoid excessive database calls
          onAccountNameChange(e.target.value);
        }}
        placeholder="Account Name"
        maxLength={30}
        autoComplete="off"
        aria-invalid={!!accountNameError}
      />
      {accountNameError && <p className="text-red-600 text-xs">{accountNameError}</p>}

      {/* Setup Status Messages */}
      {setupError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{setupError}</p>
        </div>
      )}

      {/* Actions moved to footer */}
    </form>
  );
}
