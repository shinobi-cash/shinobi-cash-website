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
import { type AppError, getUserMessage, ErrorCode } from "@/lib/errors/errors";
import { getTxExplorerUrl } from "@/config/chains";
import { formatDateTime } from "@/utils/formatters";
import { POOL_CHAIN } from "@shinobi-cash/constants";

type WithdrawStatus =
  | "idle"
  | "previewing"
  | "preparing"
  | "ready"
  | "submitting"
  | "confirmed"
  | "indexed"
  | "error";

interface WithdrawalTimelineScreenProps {
  amount: number;
  status: WithdrawStatus;
  txHash: string | null;
  error: AppError | null;
  isCrossChain: boolean;
  onClose: () => void;
}

export function WithdrawalTimelineScreen({
  amount,
  status,
  txHash,
  error,
  isCrossChain,
  onClose,
}: WithdrawalTimelineScreenProps) {
  const hasError = error !== null;

  const explorerUrl = txHash ? getTxExplorerUrl(POOL_CHAIN.id, txHash) : null;

  // Track timestamps and durations for each step
  const [timings, setTimings] = useState<Record<string, StepTiming>>({});

  // Derive states from controller status directly
  const isPreparing = status === "preparing";
  const isSubmitting = status === "submitting";
  const isConfirmed = status === "confirmed" || status === "indexed";

  // Complete when tx is confirmed on-chain
  const isComplete = isConfirmed;

  // Title based on state
  const title = isComplete
    ? "Withdrawal complete"
    : hasError
      ? "Withdrawal failed"
      : isSubmitting
        ? "Submitting withdrawal"
        : isPreparing
          ? "Preparing withdrawal"
          : "Processing withdrawal";

  // Error classification
  const isPreparationError =
    error &&
    (error.code === ErrorCode.WITHDRAWAL.FEE_ESTIMATION_FAILED ||
      error.code === ErrorCode.WITHDRAWAL.PRECONDITION ||
      error.code === ErrorCode.WITHDRAWAL.CONTEXT_FAILED ||
      error.code === ErrorCode.WITHDRAWAL.WITNESS_FAILED ||
      error.code === ErrorCode.WITHDRAWAL.PROOF_FAILED);

  const isTransactionError = error && error.code === ErrorCode.WITHDRAWAL.TRANSACTION_FAILED;

  // Determine which step failed
  const failedAtStep = isPreparationError ? "preparing" : isTransactionError ? "submitting" : null;

  // Step 1: Preparing (proof generation)
  const preparingStatus: StepStatus = isPreparationError
    ? "failed"
    : isSubmitting || isComplete
      ? "completed"
      : isPreparing
        ? "active"
        : "pending";

  // Step 2: Submitting (tx submission + wait for receipt)
  const submittingStatus: StepStatus = isTransactionError
    ? "failed"
    : isComplete
      ? "completed"
      : isSubmitting
        ? "active"
        : "pending";

  // Step 3: Complete
  const completeStatus: StepStatus = isComplete ? "completed" : "pending";

  const getErrorMessage = (): string | undefined => {
    if (isPreparationError) return getUserMessage(error);
    if (isTransactionError) return getUserMessage(error);
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
    ? "Your withdrawal intent is on-chain. A solver will fill it within ~5-10 minutes."
    : "Your withdrawal is confirmed. Notes will sync shortly.";

  const timeline: TimelineItem[] = [
    {
      label: "Preparing",
      status: preparingStatus,
      description: "Generating zero-knowledge proof.",
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
          <span className="text-5xl font-extrabold">{amount.toFixed(4)} ETH</span>
        </div>

        <TimelineSteps items={timeline} />
      </div>
    </ScreenLayout>
  );
}
