/**
 * Add Passkey Modal
 * Allows users with wallet-based accounts to add passkey authentication
 * @file features/auth/components/AddPasskeyModal.tsx
 */

import { useAuth } from "@/contexts/AuthContext";
import { useAccountNameValidation } from "@/hooks/useAccountNameValidation";
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
import { useAddPasskeyFlow } from "../passkey/usePasskey";

interface AddPasskeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPasskeyModal({ open, onOpenChange }: AddPasskeyModalProps) {
  const [accountName, setAccountName] = useState("");
  const { accountNameError, onAccountNameChange, setAccountNameError } = useAccountNameValidation();
  const [setupError, setSetupError] = useState("");
  const { getFullKeys } = useAuth();

  // Use shared passkey flow (handles setup, sync baseline, toast)
  // setAuthKeys: false because account is already authenticated
  const passkeyFlow = useAddPasskeyFlow({
    onSuccess: () => onOpenChange(false),
    setAuthKeys: false, // User is already authenticated with wallet
  });

  const { isProcessing, error: passkeyError, addPasskey, clearError } = passkeyFlow;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setAccountName("");
      setAccountNameError("");
      setSetupError("");
      clearError();
    }
  }, [open, setAccountNameError, clearError]);

  const handleAddPasskey = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      // Get full keys from auth context
      const generatedKeys = getFullKeys();

      if (accountNameError || !accountName.trim() || !generatedKeys) {
        return;
      }

      setSetupError("");

      // Use shared passkey flow (handles setup, sync baseline, toast, and close modal)
      const success = await addPasskey(accountName, generatedKeys);

      if (!success && passkeyError) {
        setSetupError(passkeyError.message);
      }
    },
    [accountName, accountNameError, getFullKeys, addPasskey, passkeyError]
  );

  const canSubmit = !isProcessing && !accountNameError && accountName.trim() && getFullKeys();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-linear-to-br border-gray-700 from-gray-900 via-gray-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Fingerprint className="h-5 w-5 text-blue-500" />
            Add Passkey
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a passkey to your account for convenient sign-in without needing to connect your
            wallet each time.
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
            {accountNameError && <p className="text-xs text-red-400">{accountNameError}</p>}
          </div>

          {setupError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/20 p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{setupError}</p>
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
            <Button variant={"default"} type="submit" disabled={!canSubmit}>
              <Fingerprint /> {isProcessing ? "Creating..." : "Create Passkey"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
