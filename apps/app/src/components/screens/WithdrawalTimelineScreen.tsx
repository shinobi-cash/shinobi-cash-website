/**
 * Withdrawal Timeline Screen - New Controller Pattern
 * Interaction Contract: Preview → Confirm → Timeline
 * - Preview mode: Shows fee breakdown (lightweight preview)
 * - Timeline mode: Shows 6-step progress tracking engine phases
 */

import { useMemo } from "react";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { WithdrawalPreview } from "@/components/withdraw/WithdrawalPreview";
import { WithdrawalTimeline } from "@/components/withdraw/WithdrawalTimeline";
import { useWithdrawController } from "@/hooks/useWithdrawController";
import { WithdrawController, WithdrawSelectors } from "@/controllers/WithdrawController";
import { EnginePhase } from "@/services/WithdrawalOrchestratorService";

interface WithdrawalTimelineScreenProps {
  onBack: () => void;
  onConfirm: () => void;
}

export function WithdrawalTimelineScreen({ onBack, onConfirm }: WithdrawalTimelineScreenProps) {
  // Read controller state
  const state = useWithdrawController();

  // Handle close from timeline mode (after work is done)
  // Reset controller state and close the screen
  const handleTimelineClose = () => {
    WithdrawController.reset();
    onBack();
  };

  // Determine screen mode based on FSM state
  // Preview mode: Before work starts (idle, previewing)
  // Timeline mode: During/after work (preparing, submitting, confirmed, error)
  const screenMode = useMemo(() => {
    const status = state.state.status;
    if (
      status === "preparing" ||
      status === "ready" ||
      status === "submitting" ||
      status === "confirmed" ||
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
    if (state.state.status === "confirmed") {
      return state.state.txHash;
    }
    return null;
  }, [state.state]);

  const isConfirmed = state.state.status === "confirmed";
  const error = state.state.status === "error" ? state.state.error : state.lastError;

  const title = screenMode === "preview" ? "Transaction Preview" : "Withdrawal Progress";

  const withdrawAmount = state.amount;
  const youReceive = WithdrawSelectors.getYouReceive();
  const executionFee = WithdrawSelectors.getExecutionFee();
  const solverFee = WithdrawSelectors.getSolverFee();
  const recipientAddress = state.recipientAddress;
  const destinationChainId = state.destinationChainId;
  const isCrossChain = WithdrawSelectors.isCrossChain();
  const isProcessing = state.state.status === "preparing" || state.state.status === "submitting";

  return (
    <ScreenLayout header={<ScreenHeader title={title} onBack={onBack} />}>
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
          onClose={handleTimelineClose}
        />
      )}
    </ScreenLayout>
  );
}
