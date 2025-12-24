/**
 * Withdrawal Controller
 * Main orchestrator for the withdrawal feature
 * Coordinates all child hooks and owns the state machine
 */

import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Note } from "@/lib/storage/types";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import type { WithdrawStatus, WithdrawError } from "../types";
import { useNoteSelection } from "../hooks/useNoteSelection";
import { useWithdrawFormState } from "../hooks/useWithdrawFormState";
import { useWithdrawProof } from "../hooks/useWithdrawProof";
import { useWithdrawTransaction } from "../hooks/useWithdrawTransaction";
import { resolveWithdrawRoute } from "../protocol/withdrawRoute";
import { formatWithdrawAmountsForDisplay } from "../protocol/withdrawFees";
import { formatEthAmount } from "@/utils/formatters";

// ============ TYPES ============

export interface WithdrawController {
  // State
  status: WithdrawStatus;
  lastError: WithdrawError;
  canWithdraw: boolean;

  // Form state
  amount: string;
  recipientAddress: string;
  destinationChainId: number;
  amountError: string | null;
  addressError: string | null;

  // Note selection
  selectedNote: Note | null;
  availableNotes: Note[];
  isLoadingNotes: boolean;

  // Balance calculations (normalized numbers - UI should render, not calculate)
  noteBalance: number;
  remainingBalance: number;

  // Fee breakdown
  executionFee: number;
  solverFee: number;
  youReceive: number;
  isCrossChain: boolean;

  // Transaction state
  transactionHash: string | null;
  isSubmitted: boolean;

  // Proof state
  isPreparing: boolean;

  // Actions
  setAmount: (value: string) => void;
  setRecipientAddress: (value: string) => void;
  setDestinationChain: (chainId: number) => void;
  setMax: () => void;
  selectNote: (note: Note | null) => void;
  prepareWithdrawal: () => Promise<void>;
  executeWithdrawal: () => Promise<void>;
  reset: () => void;
}

// ============ CONTROLLER ============

export function useWithdrawController(
  asset: { symbol: string; name: string; icon: string },
  onTransactionSuccess?: () => void
): WithdrawController {
  const { publicKey, accountKey } = useAuth();
  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  // TypeScript assertion: AuthenticationGate ensures these values exist
  if (!publicKey || !accountKey) {
    throw new Error("useWithdrawController: Missing auth values despite AuthenticationGate");
  }

  // ============ CHILD HOOKS ============

  const noteSelection = useNoteSelection(publicKey, poolAddress, null);
  const form = useWithdrawFormState(noteSelection.selectedNote, asset.symbol);
  const proof = useWithdrawProof();
  const transaction = useWithdrawTransaction();

  // ============ DERIVED STATE ============

  // Calculate fee breakdown
  const route = useMemo(
    () => resolveWithdrawRoute(form.destinationChainId),
    [form.destinationChainId]
  );

  const feeBreakdown = useMemo(() => {
    if (!form.amount) {
      return {
        executionFee: 0,
        solverFee: 0,
        youReceive: 0,
        isCrossChain: false,
      };
    }
    return formatWithdrawAmountsForDisplay(form.amount, route);
  }, [form.amount, route]);

  // Balance calculations - normalized numbers (UI should render, not calculate)
  const noteBalance = useMemo(
    () =>
      noteSelection.selectedNote
        ? parseFloat(formatEthAmount(noteSelection.selectedNote.amount))
        : 0,
    [noteSelection.selectedNote]
  );

  const remainingBalance = useMemo(
    () => noteBalance - (parseFloat(form.amount) || 0),
    [noteBalance, form.amount]
  );

  // Error domain typing
  const lastError: WithdrawError = transaction.transactionError
    ? { type: "transaction", message: transaction.transactionError }
    : proof.proofError
      ? { type: "proof", message: proof.proofError }
      : form.amountError
        ? { type: "validation", message: form.amountError }
        : form.addressError
          ? { type: "validation", message: form.addressError }
          : null;

  // Status state machine - single source of truth
  const getStatus = useCallback((): WithdrawStatus => {
    if (transaction.isSubmitted) return "submitted";
    if (transaction.isExecuting) return "submitting";
    if (proof.proofError) return "proof-failed";
    if (proof.isGenerating) return "preparing-proof";
    if (!noteSelection.selectedNote) return "no-note-selected";
    if (form.amountError) return "invalid-amount";
    if (form.addressError) return "invalid-address";
    if (form.amount.trim() !== "" && form.recipientAddress.trim() !== "") return "ready";
    return "idle";
  }, [
    transaction.isSubmitted,
    transaction.isExecuting,
    proof.proofError,
    proof.isGenerating,
    noteSelection.selectedNote,
    form.amountError,
    form.addressError,
    form.amount,
    form.recipientAddress,
  ]);

  const status = getStatus();
  const canWithdraw = status === "ready"; // Derived from status

  // ============ ACTIONS ============

  /**
   * Prepare withdrawal - generate ZK proof
   */
  const prepareWithdrawal = useCallback(async () => {
    if (!noteSelection.selectedNote || !canWithdraw) return;

    try {
      await proof.generateProof(
        noteSelection.selectedNote,
        form.amount,
        form.recipientAddress,
        accountKey,
        form.destinationChainId
      );
    } catch (err) {
      // Error is already captured in proof hook state
      console.error("Withdrawal preparation failed:", err);
    }
  }, [
    noteSelection.selectedNote,
    canWithdraw,
    proof,
    form.amount,
    form.recipientAddress,
    accountKey,
    form.destinationChainId,
  ]);

  /**
   * Execute withdrawal - submit transaction
   */
  const executeWithdrawal = useCallback(async () => {
    if (!proof.preparedWithdrawal) {
      console.error("No prepared withdrawal found");
      return;
    }

    try {
      await transaction.executeWithdrawal(proof.preparedWithdrawal);
      onTransactionSuccess?.();
    } catch (err) {
      // Error is already captured in transaction hook state
      console.error("Withdrawal execution failed:", err);
    }
  }, [proof.preparedWithdrawal, transaction, onTransactionSuccess]);

  /**
   * Reset entire withdrawal flow
   *
   * Use cases:
   * - onBack navigation to clear state
   * - After transaction success to prepare for new withdrawal
   * - Error recovery to start fresh
   */
  const reset = useCallback(() => {
    form.reset();
    proof.reset();
    transaction.reset();
  }, [form, proof, transaction]);

  // ============ RETURN CONTROLLER ============

  return {
    // State
    status,
    lastError,
    canWithdraw,

    // Form state
    amount: form.amount,
    recipientAddress: form.recipientAddress,
    destinationChainId: form.destinationChainId,
    amountError: form.amountError,
    addressError: form.addressError,

    // Note selection
    selectedNote: noteSelection.selectedNote,
    availableNotes: noteSelection.availableNotes,
    isLoadingNotes: noteSelection.isLoadingNotes,

    // Balance calculations (normalized numbers)
    noteBalance,
    remainingBalance,

    // Fee breakdown
    executionFee: feeBreakdown.executionFee,
    solverFee: feeBreakdown.solverFee,
    youReceive: feeBreakdown.youReceive,
    isCrossChain: feeBreakdown.isCrossChain,

    // Transaction state
    transactionHash: transaction.transactionHash,
    isSubmitted: transaction.isSubmitted,

    // Proof state
    isPreparing: proof.isGenerating,

    // Actions
    setAmount: form.setAmount,
    setRecipientAddress: form.setRecipientAddress,
    setDestinationChain: form.setDestinationChain,
    setMax: form.setMax,
    selectNote: noteSelection.setSelectedNote,
    prepareWithdrawal,
    executeWithdrawal,
    reset,
  };
}
