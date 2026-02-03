"use client";

import { Fingerprint, Check } from "lucide-react";
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
import { AuthController } from "@/controllers/AuthController";
import { TimelineSteps, type TimelineItem, type StepStatus } from "@/components/shared/Timeline";
import { getUserMessage } from "@/lib/errors/errors";

interface AddPasskeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SetupStep = "idle" | "registering" | "verifying" | "complete";
type FailedStep = "registering" | "verifying" | null;

export function AddPasskeyModal({ open, onOpenChange }: AddPasskeyModalProps) {
  const [error, setError] = useState("");
  const [step, setStep] = useState<SetupStep>("idle");
  const [failedStep, setFailedStep] = useState<FailedStep>(null);

  useEffect(() => {
    if (!open) {
      setError("");
      setStep("idle");
      setFailedStep(null);
    }
  }, [open]);

  const handleEnable = useCallback(async () => {
    setError("");
    setFailedStep(null);

    // Step 1: Register credential
    setStep("registering");
    let credentialId: string;
    try {
      credentialId = await AuthController.registerPasskeyCredential();
    } catch (err) {
      setError(getUserMessage(err, "Failed to register biometrics"));
      setFailedStep("registering");
      return;
    }

    // Step 2: Verify and complete setup
    setStep("verifying");
    try {
      await AuthController.completePasskeySetup(credentialId);
      setStep("complete");
    } catch (err) {
      setError(getUserMessage(err, "Failed to verify setup"));
      setFailedStep("verifying");
    }
  }, []);

  const isFailed = failedStep !== null;
  const isProcessing = (step === "registering" || step === "verifying") && !isFailed;
  const isComplete = step === "complete";

  const getStepStatus = (targetStep: "registering" | "verifying"): StepStatus => {
    if (failedStep === targetStep) return "failed";
    if (step === "idle") return "pending";
    if (step === "registering") {
      return targetStep === "registering" ? "active" : "pending";
    }
    if (step === "verifying") {
      return targetStep === "registering" ? "completed" : "active";
    }
    if (step === "complete") return "completed";
    return "pending";
  };

  const timeline: TimelineItem[] = [
    {
      label: "Register biometrics",
      status: getStepStatus("registering"),
      description: "Authenticate with fingerprint or face ID",
      errorMessage: failedStep === "registering" ? error : undefined,
    },
    {
      label: "Verify setup",
      status: getStepStatus("verifying"),
      description: "Confirm biometric enrollment",
      errorMessage: failedStep === "verifying" ? error : undefined,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-neutral-900 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Fingerprint className="h-5 w-5 text-emerald-500" />
            Enable Quick Unlock
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Use biometrics to sign in without wallet signatures.
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          <TimelineSteps items={timeline} />
        </div>

        {isComplete && (
          <div className="flex items-center justify-center gap-2 pt-2 text-emerald-400">
            <Check className="h-5 w-5" />
            <span className="font-medium">Quick Unlock enabled</span>
          </div>
        )}

        {isComplete ? (
          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Done
            </Button>
          </DialogFooter>
        ) : (
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
              onClick={handleEnable}
              disabled={isProcessing}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Fingerprint className="h-4 w-4" />
              {isProcessing ? "Authenticating..." : isFailed ? "Retry" : "Enable"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
