"use client";

import { Fingerprint } from "lucide-react";
import { useCallback, useState } from "react";
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
import { AuthController } from "@/controllers/AuthController";

interface RemovePasskeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemovePasskeyModal({ open, onOpenChange }: RemovePasskeyModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRemove = useCallback(async () => {
    setIsProcessing(true);
    try {
      await AuthController.removePasskey();
      showToast.success("Quick Unlock disabled");
      onOpenChange(false);
    } catch {
      showToast.error("Failed to remove Quick Unlock");
    } finally {
      setIsProcessing(false);
    }
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-neutral-900 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Fingerprint className="h-5 w-5 text-rose-500" />
            Remove Quick Unlock?
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            You&apos;ll need to use your wallet to sign in. Your account and funds are not affected.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="border-white/10 bg-transparent text-neutral-300 hover:bg-white/5 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRemove}
            disabled={isProcessing}
            className="bg-rose-600 text-white hover:bg-rose-700"
          >
            <Fingerprint className="h-4 w-4" />
            {isProcessing ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
