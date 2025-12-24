/**
 * Account Setup Form
 * Passkey setup for convenient authentication
 * Handles account validation, passkey creation, and encrypted key storage
 * @file features/auth/components/AccountSetupForm.tsx
 */

import { useAccountNameValidation } from "@/hooks/useAccountNameValidation";
import { storageManager } from "@/lib/storage";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { AlertCircle, Fingerprint } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@workspace/ui/components/input";
import { useAddPasskeyFlow, useAuthController } from "@/features/auth";
import { Button } from "@workspace/ui/components/button";

interface AccountSetupFormProps {
  generatedKeys: KeyGenerationResult | null;
  encryptionKey: Uint8Array | null;
  walletAddress: string | null;
  onAccountSetupComplete: () => void;
  onSkip?: () => void;
  hasExistingAccounts?: boolean;
  onLoginChoice?: () => void;
}

export default function AccountSetupForm({
  generatedKeys,
  encryptionKey,
  walletAddress,
  onAccountSetupComplete,
  onSkip,
  hasExistingAccounts,
  onLoginChoice,
}: AccountSetupFormProps) {
  return (
    <PasskeySetupForm
      generatedKeys={generatedKeys}
      encryptionKey={encryptionKey}
      walletAddress={walletAddress}
      onSuccess={onAccountSetupComplete}
      onSkip={onSkip}
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
}: {
  generatedKeys: KeyGenerationResult | null;
  encryptionKey: Uint8Array | null;
  walletAddress: string | null;
  onSuccess: () => void;
  onSkip?: () => void;
}) {
  const [accountName, setAccountName] = useState("");
  const { accountNameError, onAccountNameChange, setAccountNameError } = useAccountNameValidation();
  const [setupError, setSetupError] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);

  // Controllers
  const authController = useAuthController();
  const passkeyFlow = useAddPasskeyFlow({
    onSuccess,
    setAuthKeys: true, // This is a new account, so set auth keys
  });

  const isProcessing = passkeyFlow.isProcessing;

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

    setSetupError("");

    // Use shared passkey flow (handles setup, auth, sync baseline, toast, and callback)
    const success = await passkeyFlow.addPasskey(accountName, generatedKeys);

    if (!success && passkeyFlow.error) {
      setSetupError(passkeyFlow.error.message);
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

      // Authenticate user with generated keys
      authController.authenticate(generatedKeys);

      // Complete setup and proceed to syncing
      onSkip();
    } catch (error) {
      console.error("Failed to initialize wallet account:", error);
      setSetupError("Failed to save account. Please try again.");
    }
  }, [generatedKeys, encryptionKey, walletAddress, onSkip, authController]);

  const isFormDisabled =
    isProcessing || !!accountNameError || !accountName.trim() || !generatedKeys;

  return (
    <>
      <div className="flex-1 px-4 py-6">
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
          {accountNameError && <p className="text-xs text-red-600">{accountNameError}</p>}

          {/* Setup Status Messages */}
          {setupError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{setupError}</p>
            </div>
          )}
        </form>
      </div>

      <div className="border-t border-gray-800 px-4 py-4">
        <div className="grid w-full grid-cols-2 gap-3">
          {onSkip && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
              size="lg"
            >
              Skip for now
            </Button>
          )}
          <Button
            variant="default"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={isFormDisabled}
            className={`${onSkip ? "col-span-1" : "col-span-2"} min-h-12 w-full rounded-2xl py-3 text-base font-medium`}
            size="lg"
          >
            <span className="flex w-full items-center justify-center gap-2 text-center leading-tight">
              <Fingerprint className="h-5 w-5" />
              Continue
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}
