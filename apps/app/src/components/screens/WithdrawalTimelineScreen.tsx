/**
 * Withdrawal Timeline Screen - New Controller Pattern
 * Interaction Contract: Preview → Confirm → Timeline
 * - Preview mode: Shows fee breakdown (lightweight preview)
 * - Timeline mode: Shows 6-step progress tracking engine phases
 */

import { useMemo, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { WithdrawalPreview } from "@/components/withdraw/WithdrawalPreview";
import { WithdrawalTimeline } from "@/components/withdraw/WithdrawalTimeline";
import { useWithdrawController } from "@/hooks/useWithdrawController";
import { WithdrawController, WithdrawSelectors } from "@/controllers/WithdrawController";
import { EnginePhase } from "@/services/WithdrawalOrchestratorService";
import { useTransactionTracking } from "@/hooks/useTransactionTracking";
import { POOL_CHAIN } from "@shinobi-cash/constants";

interface WithdrawalTimelineScreenProps {
  onBack: () => void;
  onConfirm: () => void;
}

export function WithdrawalTimelineScreen({ onBack, onConfirm }: WithdrawalTimelineScreenProps) {
  // Read controller state
  const state = useWithdrawController();

  // Transaction tracking for indexing status
  const { trackTransaction, trackingStatus, onTransactionIndexed } = useTransactionTracking();

  // Listen for indexed event to update controller
  useEffect(() => {
    return onTransactionIndexed(() => {
      WithdrawController.markIndexed();
    });
  }, [onTransactionIndexed]);

  // Handle close from timeline mode (after work is done)
  // Reset controller state and close the screen
  const handleTimelineClose = () => {
    WithdrawController.reset();
    onBack();
  };

  // Determine screen mode based on FSM state
  // Preview mode: Before work starts (idle, previewing)
  // Timeline mode: During/after work (preparing, submitting, confirmed, indexed, error)
  const screenMode = useMemo(() => {
    const status = state.state.status;
    if (
      status === "preparing" ||
      status === "ready" ||
      status === "submitting" ||
      status === "confirmed" ||
      status === "indexed" ||
      status === "error"
    ) {
      return "timeline";
    }
    return "preview";
  }, [state.state.status]);

  // Derive current engine phase for timeline
  const currentPhase: EnginePhase | null = useMemo(() => {
    if (state.state.status === "preparing") {
      return state.state.phase;
    }
    if (state.state.status === "ready" || state.state.status === "submitting") {
      return "prepared";
    }
    return null;
  }, [state.state]);

  // Get transaction details
  const txHash = useMemo(() => {
    if (state.state.status === "confirmed" || state.state.status === "indexed") {
      return state.state.txHash;
    }
    return null;
  }, [state.state]);

  // Track transaction for indexing when txHash becomes available
  useEffect(() => {
    if (txHash) {
      trackTransaction(txHash, POOL_CHAIN.id);
    }
  }, [txHash, trackTransaction]);

  const isConfirmed = state.state.status === "confirmed" || state.state.status === "indexed";
  const isIndexed = state.state.status === "indexed";
  const hasError = state.state.status === "error";
  const error = hasError ? state.state.error : state.lastError;

  const title = screenMode === "preview" ? "Transaction Preview" : "Transaction details";

  // Back button enabled in preview mode, or after success/failure in timeline mode
  const canGoBack = screenMode === "preview" || isIndexed || hasError;

  const withdrawAmount = state.amount;
  const youReceive = WithdrawSelectors.getYouReceive();
  const executionFee = WithdrawSelectors.getExecutionFee();
  const solverFee = WithdrawSelectors.getSolverFee();
  const recipientAddress = state.recipientAddress;
  const destinationChainId = state.destinationChainId;
  const isCrossChain = WithdrawSelectors.isCrossChain();
  const isProcessing = state.state.status === "preparing" || state.state.status === "submitting";

  const timelineFooter = (
    <Button
      onClick={handleTimelineClose}
      className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
      size="lg"
    >
      Close
    </Button>
  );

  return (
    <ScreenLayout
      header={<ScreenHeader title={title} onBack={onBack} backDisabled={!canGoBack} />}
      footer={screenMode === "timeline" ? timelineFooter : undefined}
      contentClassName={
        screenMode === "timeline"
          ? "space-y-4 px-6 py-4"
          : "space-y-4 px-6 py-4 font-sans text-white"
      }
    >
      {screenMode === "preview" ? (
        <WithdrawalPreview
          onBack={onBack}
          onConfirm={onConfirm}
          withdrawAmount={withdrawAmount}
          executionFee={executionFee}
          solverFee={solverFee}
          youReceive={youReceive}
          recipientAddress={recipientAddress}
          destinationChainId={destinationChainId}
          isCrossChain={isCrossChain}
          isProcessing={isProcessing}
        />
      ) : (
        <WithdrawalTimeline
          amount={parseFloat(withdrawAmount) || 0}
          currentPhase={currentPhase}
          txHash={txHash}
          error={error}
          isConfirmed={isConfirmed}
          isIndexed={isIndexed}
          trackingStatus={trackingStatus}
        />
      )}
    </ScreenLayout>
  );
}
