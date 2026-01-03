"use client";

/**
 * Add Passkey Modal
 * Enables passkey unlock for the current wallet account
 * @file features/auth/components/AddPasskeyModal.tsx
 */

import { storageManager } from "@/lib/storage";
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
import { useAddPasskeyFlow } from "../../passkey/usePasskey";

interface AddPasskeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPasskeyModal({ open, onOpenChange }: AddPasskeyModalProps) {
  const [setupError, setSetupError] = useState("");

  // Shared passkey flow
  const {
    isProcessing,
    error: passkeyError,
    addPasskey,
    clearError,
  } = useAddPasskeyFlow({
    onSuccess: () => onOpenChange(false),
    setAuthKeys: false, // already authenticated
  });

  // Reset error on close
  useEffect(() => {
    if (!open) {
      setSetupError("");
      clearError();
    }
  }, [open, clearError]);

  const handleAddPasskey = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      setSetupError("");

      try {
        // Get current wallet account data
        const accountData = await storageManager.getAccountData();
        if (!accountData) {
          throw new Error("Account data not available");
        }

        // Use walletAccountId as passkey name (no user input needed)
        const walletAccountId = accountData.accountId;

        const success = await addPasskey(walletAccountId, {
          publicKey: accountData.publicKey,
          privateKey: accountData.privateKey,
          address: accountData.address,
        });

        if (!success && passkeyError) {
          setSetupError(passkeyError.message);
        }
      } catch (err) {
        setSetupError(err instanceof Error ? err.message : "Failed to enable quick unlock");
      }
    },
    [addPasskey, passkeyError]
  );

  const canSubmit = !isProcessing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-linear-to-br border-gray-700 from-gray-900 via-gray-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Fingerprint className="h-5 w-5 text-blue-500" />
            Enable Quick Unlock
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Use fingerprint or face unlock to skip wallet signatures on reload. Stored securely on
            this device only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddPasskey} className="space-y-4">
          {setupError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/20 p-3">
              <AlertCircle className="h-4 w-4 text-red-400" />
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
            <Button type="submit" disabled={!canSubmit}>
              <Fingerprint />
              {isProcessing ? "Enabling..." : "Enable Quick Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
