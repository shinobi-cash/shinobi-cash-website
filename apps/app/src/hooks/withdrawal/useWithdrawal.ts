// File: src/hooks/transactions/useWithdrawalFlow.ts

import type { WithdrawalStep } from "@/components/features/withdrawal/WithdrawalTimelineScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import type { Note } from "@/lib/storage/types";
import { showToast } from "@/lib/toast";
import type { PreparedWithdrawal, WithdrawalRequest } from "@/services/withdrawal/types";
import { executePreparedWithdrawal, processWithdrawal } from "@/services/withdrawal/withdrawalService";
import { validateWithdrawalRequest } from "@/services/withdrawal/helpers";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseWithdrawalProps {
  note: Note;
  destinationChainId?: number;
  onTransactionSuccess?: () => void;
}

export function useWithdrawal({ note, destinationChainId, onTransactionSuccess }: UseWithdrawalProps) {
  const { accountKey } = useAuth();
  const { trackTransaction } = useTransactionTracking();

  if (!accountKey) {
    throw new Error("useWithdrawalFlow: Missing accountKey despite AuthenticationGate");
  }

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [state, setState] = useState({
    showPreview: false,
    isPreparing: false,
    preparationError: null as string | null,
    preparedWithdrawal: null as PreparedWithdrawal | null,
    isExecuting: false,
    showTimeline: false,
    steps: [] as WithdrawalStep[],
    showPreviewMode: false,
    currentStep: 0, // <-- Added back here
  });

  const initializeSteps = useCallback(() => {
    const initialSteps: WithdrawalStep[] = [
      {
        id: "validation",
        title: "Validating Request",
        description: "Checking note status, amounts, and recipient address...",
        status: "pending",
      },
      {
        id: "proof-generation",
        title: "Generating Privacy Proof",
        description: "Creating zero-knowledge proof to preserve anonymity...",
        status: "pending",
      },
      {
        id: "transaction-prep",
        title: "Preparing Transaction",
        description: "Building withdrawal transaction with smart account...",
        status: "pending",
      },
      { id: "ready", title: "Ready for Preview", description: "Withdrawal prepared successfully!", status: "pending" },
    ];
    setState((prevState) => ({ ...prevState, steps: initialSteps, currentStep: 0 }));
  }, []);

  const updateStepStatus = useCallback((stepId: string, status: WithdrawalStep["status"], error?: string) => {
    if (!mountedRef.current) return;

    setState((prevState) => {
      const updatedSteps = prevState.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status,
              timestamp: Date.now(),
              ...(error && { error }),
            }
          : step,
      );

      const newCurrentStep = updatedSteps.findIndex((s) => s.status === "processing" || s.status === "error");

      return {
        ...prevState,
        steps: updatedSteps,
        currentStep: newCurrentStep >= 0 ? newCurrentStep : prevState.steps.findIndex((s) => s.id === stepId),
      };
    });
  }, []);

  const handlePreviewWithdrawal = useCallback(
    async (withdrawAmount: string, recipientAddress: string) => {
      setState((prevState) => ({ ...prevState, isPreparing: true, preparationError: null, showPreviewMode: false }));

      initializeSteps();
      setState((prevState) => ({ ...prevState, showTimeline: true }));

      try {
        const withdrawalRequest: WithdrawalRequest = {
          note,
          withdrawAmount,
          recipientAddress,
          accountKey,
          destinationChainId,
        };

        updateStepStatus("validation", "processing");
        await new Promise((resolve) => setTimeout(resolve, 500));

        validateWithdrawalRequest(withdrawalRequest);
        updateStepStatus("validation", "completed");

        updateStepStatus("proof-generation", "processing");

        const prepared = await processWithdrawal(withdrawalRequest);
        if (!mountedRef.current) return;
        updateStepStatus("proof-generation", "completed");

        updateStepStatus("transaction-prep", "processing");
        await new Promise((resolve) => setTimeout(resolve, 300));
        updateStepStatus("transaction-prep", "completed");

        updateStepStatus("ready", "completed");

        setState((prevState) => ({
          ...prevState,
          preparedWithdrawal: prepared,
          showPreview: true,
        }));
      } catch (err) {
        if (mountedRef.current) {
          // Extract user-friendly error message
          const errorMessage = err instanceof Error ? err.message : "Failed to prepare withdrawal";
          setState((prevState) => ({ ...prevState, preparationError: errorMessage }));

          const currentStepIndex = state.steps.findIndex((s) => s.status === "processing");
          const currentStepId = state.steps[currentStepIndex]?.id;
          if (currentStepId) {
            updateStepStatus(currentStepId, "error", errorMessage);
          }

          // Use standardized error handling (logs, extracts message, skips cancellations)
          showToast.handleError(err, {
            action: "Withdrawal Preparation",
            fallbackMessage: "Failed to prepare withdrawal",
            context: {
              component: "useWithdrawal",
              noteAmount: note.amount,
            },
          });
        }
      } finally {
        if (mountedRef.current) setState((prevState) => ({ ...prevState, isPreparing: false }));
      }
    },
    [note, accountKey, destinationChainId, initializeSteps, updateStepStatus, state.steps],
  );

  const handleExecuteTransaction = useCallback(async () => {
    if (!state.preparedWithdrawal) {
      showToast.error("No prepared withdrawal found", { duration: 4000 });
      return;
    }

    if (!mountedRef.current) return;
    setState((prevState) => ({ ...prevState, isExecuting: true }));

    try {
      const transactionHash = await executePreparedWithdrawal(state.preparedWithdrawal);
      if (!mountedRef.current) return;

      // Withdrawals always execute on the pool chain
      trackTransaction(transactionHash, POOL_CHAIN.id);
      setState((prevState) => ({ ...prevState, showPreview: false }));
      onTransactionSuccess?.();
    } catch (err) {
      if (mountedRef.current) {
        // Use standardized error handling
        showToast.handleError(err, {
          action: "Withdrawal Execution",
          fallbackMessage: "Failed to execute withdrawal",
          context: {
            component: "useWithdrawal",
            hasPreparedWithdrawal: !!state.preparedWithdrawal,
          },
        });
      }
    } finally {
      if (mountedRef.current) setState((prevState) => ({ ...prevState, isExecuting: false }));
    }
  }, [state.preparedWithdrawal, trackTransaction, onTransactionSuccess]);

  const closePreview = useCallback(() => {
    if (!mountedRef.current) return;
    setState((prevState) => ({ ...prevState, showPreview: false }));
  }, []);

  const closeTimeline = useCallback(() => {
    if (!mountedRef.current) return;
    setState((prevState) => ({ ...prevState, showTimeline: false, showPreviewMode: false }));
  }, []);

  const handleShowPreview = useCallback(() => {
    if (!mountedRef.current) return;
    setState((prevState) => ({ ...prevState, showPreviewMode: true }));
  }, []);

  const resetStates = useCallback(() => {
    if (!mountedRef.current) return;
    setState({
      showPreview: false,
      isPreparing: false,
      preparationError: null,
      preparedWithdrawal: null,
      isExecuting: false,
      showTimeline: false,
      steps: [],
      showPreviewMode: false,
      currentStep: 0,
    });
  }, []);

  useEffect(() => {
    resetStates();
  }, [resetStates]);

  return {
    ...state,
    handlePreviewWithdrawal,
    handleExecuteTransaction,
    closePreview,
    closeTimeline,
    handleShowPreview,
    resetStates,
  };
}
