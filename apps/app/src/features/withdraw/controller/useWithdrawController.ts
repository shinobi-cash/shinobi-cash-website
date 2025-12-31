/**
 * Withdrawal Controller
 */

import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { storageManager } from "@/lib/storage";
import { parseUserKey } from "@shinobi-cash/core";
import type { Note } from "@shinobi-cash/core";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import type { WithdrawStatus, WithdrawError } from "../types/withdrawStatus";
import { useNoteSelection } from "../hooks/useNoteSelection";
import { useWithdrawFormState } from "../hooks/useWithdrawFormState";
import { useWithdrawalEngine } from "../hooks/useWithdrawalEngine";
import { usePreviewFeeQuote } from "../hooks/usePreviewFeeQuote";
import { resolveWithdrawRoute } from "../protocol/withdrawRoute";
import { parseEther, formatEther } from "viem";
import type { WithdrawalRequest } from "../domain/types";
import { formatFeeQuote, deriveWithdrawStatus } from "../domain/pipeline";

// ============ TYPES ============

export interface WithdrawController {
  status: WithdrawStatus;
  lastError: WithdrawError;
  canWithdraw: boolean;

  amount: string;
  recipientAddress: string;
  destinationChainId: number;
  amountError: string | null;
  addressError: string | null;

  selectedNote: Note | null;
  availableNotes: Note[];
  isLoadingNotes: boolean;

  noteBalance: number;
  remainingBalance: number;

  executionFee: number;
  solverFee: number;
  youReceive: number;
  isCrossChain: boolean;

  transactionHash: string | null;
  isSubmitted: boolean;

  isPreparing: boolean;

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
  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  // ---------- CRYPTO CONTEXT (SOURCE OF TRUTH) ----------
  const cryptoRef = useRef<{
    publicKey: string | null;
    accountKey: bigint | null;
  }>({
    publicKey: null,
    accountKey: null,
  });

  const [cryptoReady, setCryptoReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCrypto() {
      try {
        const accountData = await storageManager.getAccountData();
        if (!accountData || cancelled) return;

        cryptoRef.current = {
          publicKey: accountData.publicKey ?? null,
          accountKey: parseUserKey(accountData.privateKey),
        };

        setCryptoReady(true);
      } catch (err) {
        console.warn("[WithdrawController] Failed to load crypto context:", err);
      }
    }

    loadCrypto();
    return () => {
      cancelled = true;
    };
  }, []);

  const publicKey = cryptoRef.current.publicKey;
  const accountKey = cryptoRef.current.accountKey;

  // ============ CHILD HOOKS ============

  const noteSelection = useNoteSelection(publicKey ?? "", poolAddress, null);

  const form = useWithdrawFormState(noteSelection.selectedNote, asset.symbol);
  const engine = useWithdrawalEngine();

  // ============ DERIVED STATE ============

  const route = useMemo(
    () => resolveWithdrawRoute(form.destinationChainId),
    [form.destinationChainId]
  );

  const { feeQuote } = usePreviewFeeQuote(
    noteSelection.selectedNote,
    form.amount,
    form.recipientAddress,
    accountKey ?? BigInt(0),
    route.isCrossChain ? form.destinationChainId : undefined
  );

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

  const noteBalance = useMemo(() => {
    if (!noteSelection.selectedNote) return 0;
    return Number(formatEther(BigInt(noteSelection.selectedNote.amount)));
  }, [noteSelection.selectedNote]);

  const remainingBalance = useMemo(() => {
    if (!noteSelection.selectedNote || !form.amount) return noteBalance;

    try {
      const noteWei = BigInt(noteSelection.selectedNote.amount);
      const withdrawWei = parseEther(form.amount);
      const remaining = withdrawWei > noteWei ? BigInt(0) : noteWei - withdrawWei;
      return Number(formatEther(remaining));
    } catch {
      return noteBalance;
    }
  }, [noteSelection.selectedNote, form.amount, noteBalance]);

  const lastError: WithdrawError = engine.error
    ? { type: "proof", message: engine.error.message }
    : form.amountError
      ? { type: "validation", message: form.amountError }
      : form.addressError
        ? { type: "validation", message: form.addressError }
        : null;

  const status = deriveWithdrawStatus({
    hasExecutionResult: !!engine.executionResult,
    isExecuting: engine.isExecuting,
    hasEngineError: !!engine.error,
    isPreparing: engine.isPreparing,
    selectedNote: noteSelection.selectedNote,
    amountError: form.amountError,
    addressError: form.addressError,
    amount: form.amount,
    recipientAddress: form.recipientAddress,
  });

  const canWithdraw = status === "ready" && cryptoReady;

  // ============ ACTIONS ============

  const prepareWithdrawal = useCallback(async () => {
    if (!noteSelection.selectedNote || !canWithdraw || !accountKey) return;

    const request: WithdrawalRequest = {
      note: noteSelection.selectedNote,
      withdrawAmountWei: parseEther(form.amount),
      recipient: form.recipientAddress as `0x${string}`,
      accountKey,
      destinationChainId: route.isCrossChain ? form.destinationChainId : undefined,
    };

    try {
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

  const executeWithdrawal = useCallback(async () => {
    if (!engine.preparedUserOp) return;

    try {
      await engine.execute();
      onTransactionSuccess?.();
    } catch (err) {
      console.error("Withdrawal execution failed:", err);
    }
  }, [engine, onTransactionSuccess]);

  const reset = useCallback(() => {
    form.reset();
    engine.reset();
  }, [form, engine]);

  // ============ RETURN ============

  return {
    status,
    lastError,
    canWithdraw,

    amount: form.amount,
    recipientAddress: form.recipientAddress,
    destinationChainId: form.destinationChainId,
    amountError: form.amountError,
    addressError: form.addressError,

    selectedNote: noteSelection.selectedNote,
    availableNotes: noteSelection.availableNotes,
    isLoadingNotes: noteSelection.isLoadingNotes,

    noteBalance,
    remainingBalance,

    executionFee: feeBreakdown.executionFee,
    solverFee: feeBreakdown.solverFee,
    youReceive: feeBreakdown.youReceive,
    isCrossChain: feeBreakdown.isCrossChain,

    transactionHash: engine.executionResult?.transactionHash ?? null,
    isSubmitted: !!engine.executionResult,

    isPreparing: engine.isPreparing,

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
