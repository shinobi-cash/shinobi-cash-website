"use client";

import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { WithdrawalTimeline } from "@/components/withdraw/WithdrawalTimeline";
import type { AppError } from "@/lib/errors/errors";
import type { EnginePhase } from "@/services/WithdrawalOrchestratorService";
import type { TrackingStatus } from "@/hooks/useTransactionTracking";

interface WithdrawalTimelineScreenProps {
  amount: number;
  currentPhase: EnginePhase | null;
  txHash: string | null;
  error: AppError | null;
  isConfirmed: boolean;
  isIndexed: boolean;
  trackingStatus: TrackingStatus;
  onClose: () => void;
}

export function WithdrawalTimelineScreen({
  amount,
  currentPhase,
  txHash,
  error,
  isConfirmed,
  isIndexed,
  trackingStatus,
  onClose,
}: WithdrawalTimelineScreenProps) {
  const hasError = error !== null;

  // Back button enabled after success or failure
  const canGoBack = isIndexed || hasError;

  return (
    <ScreenLayout
      containerClassName="h-[600px]"
      header={<ScreenHeader title="Transaction details" onBack={onClose} backDisabled={!canGoBack} />}
      footer={
        <Button
          onClick={onClose}
          className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
          size="lg"
        >
          Close
        </Button>
      }
      contentClassName="space-y-4 px-6 py-4"
    >
      <WithdrawalTimeline
        amount={amount}
        currentPhase={currentPhase}
        txHash={txHash}
        error={error}
        isConfirmed={isConfirmed}
        isIndexed={isIndexed}
        trackingStatus={trackingStatus}
      />
    </ScreenLayout>
  );
}
