/**
 * Withdrawal Controller
 */

import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Note } from "@shinobi-cash/core";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import type { WithdrawStatus, WithdrawError } from "../types/withdrawStatus";
import { useNoteSelection } from "../hooks/useNoteSelection";
import { useWithdrawFormState } from "../hooks/useWithdrawFormState";
import { useWithdrawalEngine } from "../hooks/useWithdrawalEngine";
import { useReactiveFeeQuote } from "../hooks/useReactiveFeeQuote";
import { resolveWithdrawRoute } from "../protocol/withdrawRoute";
import { parseEther, formatEther } from "viem";
import type { WithdrawalRequest } from "../domain/types";
import { formatFeeQuote } from "../domain/pipeline";

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

  // Balance calculations
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

  if (!publicKey || !accountKey) {
    throw new Error("useWithdrawController: Missing auth values despite AuthenticationGate");
  }

  // ============ CHILD HOOKS ============

  const noteSelection = useNoteSelection(publicKey, poolAddress, null);
  const form = useWithdrawFormState(noteSelection.selectedNote, asset.symbol);
  const engine = useWithdrawalEngine();

  // ============ DERIVED STATE ============

  const route = useMemo(
    () => resolveWithdrawRoute(form.destinationChainId),
    [form.destinationChainId]
  );

  // Reactively fetch fee quotes as user types
  const { feeQuote } = useReactiveFeeQuote(
    noteSelection.selectedNote,
    form.amount,
    form.recipientAddress,
    accountKey,
    route.isCrossChain ? form.destinationChainId : undefined
  );

  // Fee breakdown from reactive fee quote
  const feeBreakdown = useMemo(() => {
    if (!feeQuote) {
      return {
        executionFee: 0,
        solverFee: 0,
        youReceive: 0,
        isCrossChain: route.isCrossChain,
      };
    }

    const formatted = formatFeeQuote(feeQuote);
    return {
      executionFee: Number(formatted.executionFeeEth),
      solverFee: Number(formatted.solverFeeEth),
      youReceive: Number(formatted.netAmountEth),
      isCrossChain: feeQuote.kind === "cross-chain",
    };
  }, [feeQuote, route.isCrossChain]);

  // Balance calculations - use BigInt internally
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

      const remainingWei =
        withdrawAmountWei > noteBalanceWei ? BigInt(0) : noteBalanceWei - withdrawAmountWei;

      return Number(formatEther(remainingWei));
    } catch {
      return noteBalance;
    }
  }, [noteSelection.selectedNote, form.amount, noteBalance]);

  // Error handling
  const lastError: WithdrawError = engine.error
    ? { type: "proof", message: engine.error.message }
    : form.amountError
      ? { type: "validation", message: form.amountError }
      : form.addressError
        ? { type: "validation", message: form.addressError }
        : null;

  // Status state machine
  const getStatus = useCallback((): WithdrawStatus => {
    if (engine.executionResult) return "submitted";
    if (engine.isExecuting) return "submitting";
    if (engine.error) return "proof-failed";
    if (engine.isPreparing) return "preparing-proof";
    if (!noteSelection.selectedNote) return "no-note-selected";
    if (form.amountError) return "invalid-amount";
    if (form.addressError) return "invalid-address";
    if (form.amount.trim() !== "" && form.recipientAddress.trim() !== "") return "ready";
    return "idle";
  }, [
    engine.executionResult,
    engine.isExecuting,
    engine.error,
    engine.isPreparing,
    noteSelection.selectedNote,
    form.amountError,
    form.addressError,
    form.amount,
    form.recipientAddress,
  ]);

  const status = getStatus();
  const canWithdraw = status === "ready";

  // ============ ACTIONS ============

  /**
   * Prepare withdrawal using new engine
   */
  const prepareWithdrawal = useCallback(async () => {
    if (!noteSelection.selectedNote || !canWithdraw || !accountKey) return;

    try {
      // Create withdrawal request
      const request: WithdrawalRequest = {
        note: noteSelection.selectedNote,
        withdrawAmountWei: parseEther(form.amount),
        recipient: form.recipientAddress as `0x${string}`,
        accountKey,
        destinationChainId: route.isCrossChain ? form.destinationChainId : undefined,
      };

      // Prepare using engine
      await engine.prepare(request);
    } catch (err) {
      console.error("Withdrawal preparation failed:", err);
    }
  }, [
    noteSelection.selectedNote,
    canWithdraw,
    accountKey,
    form.amount,
    form.recipientAddress,
    form.destinationChainId,
    route.isCrossChain,
    engine,
  ]);

  /**
   * Execute withdrawal using engine
   */
  const executeWithdrawal = useCallback(async () => {
    if (!engine.preparedUserOp) {
      console.error("No prepared withdrawal found");
      return;
    }

    try {
      await engine.execute();
      onTransactionSuccess?.();
    } catch (err) {
      console.error("Withdrawal execution failed:", err);
    }
  }, [engine, onTransactionSuccess]);

  /**
   * Reset entire withdrawal flow
   */
  const reset = useCallback(() => {
    form.reset();
    engine.reset();
  }, [form, engine]);

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

    // Balance calculations
    noteBalance,
    remainingBalance,

    // Fee breakdown
    executionFee: feeBreakdown.executionFee,
    solverFee: feeBreakdown.solverFee,
    youReceive: feeBreakdown.youReceive,
    isCrossChain: feeBreakdown.isCrossChain,

    // Transaction state
    transactionHash: engine.executionResult?.transactionHash || null,
    isSubmitted: !!engine.executionResult,

    // Proof state
    isPreparing: engine.isPreparing,

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
