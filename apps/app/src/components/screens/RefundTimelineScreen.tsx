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
import { formatDateTime, formatEthAmount, formatDisplayAmount } from "@/utils/formatters";
import type { RefundType } from "@shinobi-cash/core/intent";

type RefundStatus =
  | "idle"
  | "fetching"
  | "ready"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "error";

interface RefundTimelineScreenProps {
  amount: string;
  status: RefundStatus;
  refundType: RefundType;
  chainId: number;
  txHash: string | null;
  error: AppError | null;
  onClose: () => void;
}

export function RefundTimelineScreen({
  amount,
  status,
  refundType,
  chainId,
  txHash,
  error,
  onClose,
}: RefundTimelineScreenProps) {
  const hasError = error !== null;
  const amountNum = Number(formatEthAmount(amount, { maxDecimals: 6 }));
  const explorerUrl = txHash ? getTxExplorerUrl(chainId, txHash) : null;
  const isDeposit = refundType === "deposit";

  const [timings, setTimings] = useState<Record<string, StepTiming>>({});

  const isFetching = status === "fetching" || status === "ready";
  const isSubmitting = status === "submitting" || status === "confirming";
  const isConfirmed = status === "confirmed";
  const isComplete = isConfirmed;

  const title = isComplete
    ? "Refund complete"
    : hasError
      ? "Refund failed"
      : isSubmitting
        ? "Submitting transaction"
        : isFetching
          ? "Fetching intent data"
          : "Processing refund";

  // Error classification
  const isFetchError = error && error.category === "INDEXER";
  const isTransactionError = error && error.code === ErrorCode.BLOCKCHAIN.TRANSACTION_FAILED;

  // Step statuses
  const fetchingStatus: StepStatus = isFetchError
    ? "failed"
    : isSubmitting || isComplete || isTransactionError
      ? "completed"
      : isFetching
        ? "active"
        : "pending";

  const submittingStatus: StepStatus = isTransactionError
    ? "failed"
    : isComplete
      ? "completed"
      : isSubmitting
        ? "active"
        : "pending";

  const completeStatus: StepStatus = isComplete ? "completed" : "pending";

  // Track timings
  useEffect(() => {
    const steps = [
      { key: "fetching", status: fetchingStatus },
      { key: "submitting", status: submittingStatus },
      { key: "complete", status: completeStatus },
    ];

    setTimings((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      steps.forEach(({ key, status }) => {
        if ((status === "active" || status === "completed") && !updated[key]) {
          const now = new Date();
          updated[key] = { startTime: now, displayTime: formatDateTime(now) };
          hasChanges = true;
        }
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
  }, [fetchingStatus, submittingStatus, completeStatus]);

  const timeline: TimelineItem[] = [
    {
      label: "Fetching intent",
      status: fetchingStatus,
      description: "Loading intent data from indexer.",
      errorMessage: isFetchError ? getUserMessage(error) : undefined,
      timestamp: timings["fetching"]?.displayTime,
      duration: timings["fetching"]?.duration,
    },
    {
      label: "Submitting",
      status: submittingStatus,
      description: isDeposit
        ? "Submitting refund transaction."
        : "Submitting refund via bundler.",
      errorMessage: isTransactionError ? getUserMessage(error) : undefined,
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
      description: isDeposit
        ? "Funds returned to your wallet."
        : "Refund commitment created in pool.",
      timestamp: timings["complete"]?.displayTime,
      duration: timings["complete"]?.duration,
    },
  ];

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
          disabled={!canGoBack}
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
          <span className="text-5xl font-extrabold">{formatDisplayAmount(amountNum)} ETH</span>
        </div>

        <TimelineSteps items={timeline} />
      </div>
    </ScreenLayout>
  );
}
