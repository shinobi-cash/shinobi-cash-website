/**
 * Withdrawal Controller
 * Main orchestrator for the withdrawal feature
 * Coordinates all child hooks and owns the state machine
 */

import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Note } from "@shinobi-cash/core";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import type { WithdrawStatus, WithdrawError } from "../types";
import { useNoteSelection } from "../hooks/useNoteSelection";
import { useWithdrawFormState } from "../hooks/useWithdrawFormState";
import { useWithdrawProof } from "../hooks/useWithdrawProof";
import { useWithdrawTransaction } from "../hooks/useWithdrawTransaction";
import { useWithdrawFeeEstimation } from "../hooks/useWithdrawFeeEstimation";
import { resolveWithdrawRoute } from "../protocol/withdrawRoute";
import { parseEther, formatEther } from "viem";

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

  // Calculate fee breakdown
  const route = useMemo(
    () => resolveWithdrawRoute(form.destinationChainId),
    [form.destinationChainId]
  );

  const feeEstimation = useWithdrawFeeEstimation(form.amount, route.isCrossChain);

  // ============ DERIVED STATE ============

  const feeBreakdown = useMemo(() => {
    if (!form.amount) {
      return {
        executionFee: 0,
        solverFee: 0,
        youReceive: 0,
        isCrossChain: false,
        relayFeeBPS: 500, // Default fallback
        solverFeeBPS: 0,
      };
    }
    // Use gas-based fee estimation with solver fees for cross-chain
    // Parse ETH strings to BigInt, then convert to number for display
    const executionFeeWei = feeEstimation.executionFeeEth
      ? parseEther(feeEstimation.executionFeeEth)
      : BigInt(0);
    const solverFeeWei = feeEstimation.solverFeeEth
      ? parseEther(feeEstimation.solverFeeEth)
      : BigInt(0);
    const netAmountWei = feeEstimation.netAmountEth
      ? parseEther(feeEstimation.netAmountEth)
      : BigInt(0);

    return {
      executionFee: Number(formatEther(executionFeeWei)),
      solverFee: Number(formatEther(solverFeeWei)),
      youReceive: Number(formatEther(netAmountWei)),
      isCrossChain: route.isCrossChain,
      relayFeeBPS: feeEstimation.relayFeeBPS,
      solverFeeBPS: feeEstimation.solverFeeBPS,
    };
  }, [form.amount, route, feeEstimation]);

  // Balance calculations - use BigInt internally, convert to number for display
  const noteBalance = useMemo(() => {
    if (!noteSelection.selectedNote) return 0;

    const noteBalanceWei = BigInt(noteSelection.selectedNote.amount);
    return Number(formatEther(noteBalanceWei));
  }, [noteSelection.selectedNote]);

  const remainingBalance = useMemo(() => {
    if (!noteSelection.selectedNote || !form.amount) return noteBalance;

    try {
      const noteBalanceWei = BigInt(noteSelection.selectedNote.amount);
      const withdrawAmountWei = parseEther(form.amount);

      // Calculate remaining balance in wei
      const remainingWei =
        withdrawAmountWei > noteBalanceWei
          ? BigInt(0)
          : noteBalanceWei - withdrawAmountWei;

      return Number(formatEther(remainingWei));
    } catch {
      // If parsing fails, return note balance
      return noteBalance;
    }
  }, [noteSelection.selectedNote, form.amount, noteBalance]);

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
        form.destinationChainId,
        feeBreakdown.relayFeeBPS, // Pass calculated relayFeeBPS
        feeBreakdown.solverFeeBPS // Pass solver fee BPS for cross-chain
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
    feeBreakdown.relayFeeBPS,
    feeBreakdown.solverFeeBPS,
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
