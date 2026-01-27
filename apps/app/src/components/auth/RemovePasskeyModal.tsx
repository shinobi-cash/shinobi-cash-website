"use client";

/**
 * Remove Passkey Modal
 * Disables passkey unlock for the current wallet account
 * @file features/auth/components/RemovePasskeyModal.tsx
 */

import { AlertTriangle, Fingerprint } from "lucide-react";
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
import { showToast } from "@/lib/toast";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";

interface RemovePasskeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved?: () => void;
}

export function RemovePasskeyModal({ open, onOpenChange, onRemoved }: RemovePasskeyModalProps) {
  const [removeError, setRemoveError] = useState("");

  const {
    isProcessing,
    error: passkeyError,
    removePasskey,
    clearError,
  } = usePasskeyAuth({
    onSuccess: () => {
      showToast.success("Passkey removed. Biometric unlock has been disabled.");
      onRemoved?.();
      onOpenChange(false);
    },
  });

  // Reset error on close
  useEffect(() => {
    if (!open) {
      setRemoveError("");
      clearError();
    }
  }, [open, clearError]);

  const handleRemove = useCallback(async () => {
    setRemoveError("");

    try {
      const success = await removePasskey();

      if (!success && passkeyError) {
        setRemoveError(passkeyError.message);
      }
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove passkey");
    }
  }, [removePasskey, passkeyError]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Remove Passkey?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This will remove biometric unlock from this device. You&apos;ll need to use your wallet
            to sign in. You can add a new passkey later if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {removeError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/20 p-3">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p className="text-sm text-red-400">{removeError}</p>
            </div>
          )}

          <div className="border-border bg-muted/50 rounded-lg border p-4">
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">
              What will be removed:
            </h4>
            <ul className="text-muted-foreground space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">•</span>
                Biometric authentication data
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">•</span>
                Quick unlock on this device
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">•</span>
                Passkey credential
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-blue-900 bg-blue-950/20 p-4">
            <h4 className="mb-2 text-sm font-medium text-blue-300">What stays:</h4>
            <ul className="space-y-1 text-sm text-blue-400">
              <li className="flex items-center gap-2">
                <span className="text-blue-600">•</span>
                Your wallet account and funds
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">•</span>
                All notes and transaction history
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">•</span>
                Wallet signature authentication
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRemove}
            disabled={isProcessing}
          >
            <Fingerprint />
            {isProcessing ? "Removing..." : "Remove Passkey"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
