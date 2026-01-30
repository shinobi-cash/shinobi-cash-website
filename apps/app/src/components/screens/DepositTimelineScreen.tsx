"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import {
  StatusIcon,
  TimelineSteps,
  formatDuration,
  type TimelineItem,
  type StepStatus,
  type StepTiming,
} from "@/components/shared/Timeline";
import { type AppError, getUserMessage, isUserCancellation } from "@/lib/errors/errors";
import { getTxExplorerUrl } from "@/config/chains";
import { formatDateTime } from "@/utils/formatters";

type DepositStatus =
  | "submitting"
  | "confirming"
  | "confirmed-onchain"
  | "indexed"
  | "failed"
  | "error";

interface DepositTimelineScreenProps {
  noteAmount: number;
  status: DepositStatus;
  txHash: string | null;
  error: AppError | null;
  failedReason: string | null;
  originChainId: number;
  isCrossChain: boolean;
  onClose: () => void;
}

export function DepositTimelineScreen({
  noteAmount,
  status,
  txHash,
  error,
  failedReason,
  originChainId,
  isCrossChain,
  onClose,
}: DepositTimelineScreenProps) {
  const explorerUrl = txHash ? getTxExplorerUrl(originChainId, txHash) : null;

  // Track timestamps and durations for each step
  const [timings, setTimings] = useState<Record<string, StepTiming>>({});

  const isSubmitting = status === "submitting";
  const isConfirming = status === "confirming";
  const isConfirmedOnChain = status === "confirmed-onchain";
  const isIndexed = status === "indexed";
  const isFailed = status === "failed";
  const isError = status === "error";

  // Complete when tx is confirmed on-chain (don't wait for indexer)
  const isComplete = isConfirmedOnChain || isIndexed;

  const isUserCancelled = error && isUserCancellation(error);
  const hasError = isUserCancelled || isFailed || isError;

  // Title based on state
  const title = isComplete
    ? "Deposit complete"
    : hasError
      ? "Deposit failed"
      : isConfirming
        ? "Confirming deposit"
        : isSubmitting
          ? "Confirm in wallet"
          : "Processing deposit";

  // Determine which step failed
  const failedAtStep = isUserCancelled
    ? "preparing"
    : isError
      ? "preparing"
      : isFailed
        ? "submitting"
        : null;

  // Step 1: Preparing (wallet sign)
  const preparingStatus: StepStatus =
    failedAtStep === "preparing"
      ? "failed"
      : txHash || isConfirming || isComplete || isFailed
        ? "completed"
        : isSubmitting
          ? "active"
          : "pending";

  // Step 2: Submitting (tx confirmation)
  const submittingStatus: StepStatus =
    failedAtStep === "submitting"
      ? "failed"
      : isComplete
        ? "completed"
        : isConfirming
          ? "active"
          : preparingStatus === "completed"
            ? "active"
            : "pending";

  // Step 3: Complete
  const completeStatus: StepStatus = isComplete ? "completed" : "pending";

  const getErrorMessage = (): string | undefined => {
    if (!hasError) return undefined;
    if (isUserCancelled) return "You cancelled the transaction.";
    if (isFailed) return failedReason || "Transaction failed on-chain.";
    if (error) return getUserMessage(error);
    return undefined;
  };

  // Record timestamps when steps become active and durations when completed
  useEffect(() => {
    const steps = [
      { key: "preparing", status: preparingStatus },
      { key: "submitting", status: submittingStatus },
      { key: "complete", status: completeStatus },
    ];

    setTimings((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      steps.forEach(({ key, status }) => {
        // Record start time when step becomes active
        if ((status === "active" || status === "completed") && !updated[key]) {
          const now = new Date();
          updated[key] = {
            startTime: now,
            displayTime: formatDateTime(now),
          };
          hasChanges = true;
        }
        // Calculate duration when step completes
        if (status === "completed" && updated[key] && !updated[key].duration) {
          updated[key] = {
            ...updated[key],
            duration: formatDuration(updated[key].startTime, new Date()),
          };
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [preparingStatus, submittingStatus, completeStatus]);

  // Complete step description based on cross-chain
  const completeDescription = isCrossChain
    ? "Your deposit intent is on-chain. A solver will fill it within ~5-10 minutes."
    : "Your deposit is confirmed. Notes will sync shortly.";

  const timeline: TimelineItem[] = [
    {
      label: "Preparing",
      status: preparingStatus,
      description: "Approve the transaction in your wallet.",
      errorMessage: failedAtStep === "preparing" ? getErrorMessage() : undefined,
      timestamp: timings["preparing"]?.displayTime,
      duration: timings["preparing"]?.duration,
    },
    {
      label: "Submitting",
      status: submittingStatus,
      description: "Waiting for on-chain confirmation.",
      errorMessage: failedAtStep === "submitting" ? getErrorMessage() : undefined,
      link:
        explorerUrl && submittingStatus !== "pending"
          ? { url: explorerUrl, text: "View transaction" }
          : undefined,
      timestamp: timings["submitting"]?.displayTime,
      duration: timings["submitting"]?.duration,
    },
    {
      label: "Complete",
      status: completeStatus,
      description: completeDescription,
      timestamp: timings["complete"]?.displayTime,
      duration: timings["complete"]?.duration,
    },
  ];

  // Back button enabled after success or failure
  const canGoBack = isComplete || hasError;

  return (
    <ScreenLayout
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={
        <ScreenHeader title="Transaction details" onBack={onClose} backDisabled={!canGoBack} />
      }
      footer={
        <Button
          onClick={onClose}
          className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
          size="lg"
        >
          Close
        </Button>
      }
      contentClassName="space-y-4 px-4 py-4"
    >
      <div className="flex flex-1 flex-col items-center space-y-4">
        <div className="flex flex-col items-center space-y-2 text-center">
          <StatusIcon isComplete={isComplete} hasError={hasError} />
          <h2 className="text-2xl font-bold">{title}</h2>
          <span className="text-5xl font-extrabold">{noteAmount.toFixed(4)} ETH</span>
        </div>

        <TimelineSteps items={timeline} />
      </div>
    </ScreenLayout>
  );
}
