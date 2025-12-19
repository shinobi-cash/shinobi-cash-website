/**
 * Add Passkey Modal
 * Allows users with wallet-based accounts to add passkey authentication
 */

import { useAuth } from "@/contexts/AuthContext";
import { useAccountNameValidation } from "@/hooks/useAccountNameValidation";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";
import { storageManager } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import { AlertCircle, Fingerprint } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { performPasskeySetup } from "./helpers/authFlows";

interface AddPasskeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPasskeyModal({ open, onOpenChange }: AddPasskeyModalProps) {
  const [accountName, setAccountName] = useState("");
  const { accountNameError, onAccountNameChange, setAccountNameError } = useAccountNameValidation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupError, setSetupError] = useState("");
  const { mnemonic, publicKey, privateKey } = useAuth();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setAccountName("");
      setAccountNameError("");
      setSetupError("");
      setIsProcessing(false);
    }
  }, [open, setAccountNameError]);

  const handleAddPasskey = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      if (accountNameError || !accountName.trim() || !mnemonic) {
        return;
      }

      setIsProcessing(true);
      setSetupError("");

      try {
        // Create a KeyGenerationResult object from current auth state
        const generatedKeys = {
          mnemonic,
          publicKey: publicKey!,
          privateKey: privateKey!,
          address: publicKey!, // Using publicKey as address since we don't store Ethereum address separately
        };

        // Perform passkey setup with existing keys
        await performPasskeySetup(accountName, generatedKeys);

        // Optionally initialize sync baseline for the passkey account
        if (publicKey) {
          try {
            await storageManager.initializeSyncBaseline(publicKey);
          } catch (error) {
            console.warn("Failed to initialize sync baseline:", error);
            // Non-fatal
          }
        }

        showToast.auth.success("Passkey added successfully");
        onOpenChange(false);
      } catch (error) {
        console.error("Add passkey failed:", error);
        if (error instanceof AuthError) {
          if (error.code === AuthErrorCode.PASSKEY_PRF_UNSUPPORTED) {
            setSetupError("Device not supported - passkeys with PRF extension required");
          } else if (error.code === AuthErrorCode.ACCOUNT_ALREADY_EXISTS) {
            setSetupError("Passkey already exists for this account name");
          } else if (error.code === AuthErrorCode.PASSKEY_CANCELLED) {
            setSetupError("Setup was cancelled. Please try again.");
          } else {
            setSetupError(error.message || "Failed to add passkey. Please try again.");
          }
        } else {
          setSetupError("Failed to add passkey. Please try again.");
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [accountName, accountNameError, mnemonic, publicKey, privateKey, onOpenChange]
  );

  const canSubmit = !isProcessing && !accountNameError && accountName.trim() && mnemonic;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-linear-to-br from-gray-900 via-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Fingerprint className="h-5 w-5 text-blue-500" />
            Add Passkey
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a passkey to your account for convenient sign-in without needing to connect your wallet each time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddPasskey} className="space-y-4">
          <div className="space-y-2">
            <Input
              id="passkey-account-name"
              type="text"
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value);
                if (accountNameError) setAccountNameError("");
                if (setupError) setSetupError("");
                onAccountNameChange(e.target.value);
              }}
              placeholder="Choose a name for your passkey"
              maxLength={30}
              autoComplete="off"
              aria-invalid={!!accountNameError}
              disabled={isProcessing}
            />
            {accountNameError && <p className="text-red-400 text-xs">{accountNameError}</p>}
          </div>

          {setupError && (
            <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{setupError}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button variant={'default'} type="submit" disabled={!canSubmit}>
              <Fingerprint /> {isProcessing ? "Creating..." : "Create Passkey"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
