/**
 * Deposit Controller Hook
 * Single orchestrator for the entire deposit feature
 * - Manages all deposit state
 * - Coordinates hooks and services
 * - Provides simple API to UI
 */

import { useAuth } from "@/contexts/AuthContext";
import { useAccount, useBalance, useChainId } from "wagmi";
import { useDepositFormState } from "../hooks/useDepositFormState";
import { useDepositCommitment } from "../hooks/useDepositCommitment";
import { useDepositGasEstimate } from "../hooks/useDepositGasEstimate";
import { useDepositTransaction } from "../hooks/useDepositTransaction";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { formatEther } from "viem";
import { formatDepositAmountsForDisplay } from "../protocol/depositFees";
import { isDepositSupported } from "../protocol/depositRoute";
import { useEffect, useRef } from "react";
import type { DepositStatus, DepositError } from "../types/depositStatus";

interface Asset {
  symbol: string;
  name: string;
  icon: string;
}

interface DepositControllerState {
  // Form state
  amount: string;
  amountError: string | null;

  // Derived amounts
  depositNoteAmount: number;
  complianceFee: number;

  // Gas state
  gasCostEth: string;
  isEstimatingGas: boolean;
  gasEstimationError: string | null;

  // Transaction state
  isDepositing: boolean;
  isPreparing: boolean;
  isSubmitted: boolean; // Hash received, not necessarily confirmed
  transactionHash: string | undefined;
  transactionError: string | null;

  // Wallet state
  isConnected: boolean;
  address: string | undefined;
  balance: string;
  hasBalance: boolean;

  // Chain state
  isOnSupportedChain: boolean;
  chainId: number;

  // Computed state
  canDeposit: boolean;
  status: DepositStatus;
  lastError: DepositError;
}

interface DepositControllerActions {
  setAmount: (value: string) => void;
  deposit: () => void;
  reset: () => void;
}

export type DepositController = DepositControllerState & DepositControllerActions;

export function useDepositController(
  asset: Asset,
  onTransactionSuccess?: () => void
): DepositController {
  // Wallet & Auth
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { publicKey, accountKey } = useAuth();
  const { data: balance } = useBalance({ address });
  const { trackTransaction } = useTransactionTracking();

  const availableBalance = balance?.value ?? BigInt(0);
  const hasBalance = availableBalance > BigInt(0);
  const formattedBalance = balance?.value ? formatEther(balance.value) : "0";

  // Core hooks
  const form = useDepositFormState({ availableBalance });
  const commitment = useDepositCommitment(publicKey, accountKey);
  const gas = useDepositGasEstimate(form.amount, commitment.noteData);
  const tx = useDepositTransaction();

  // Derived state
  const isOnSupportedChain = isDepositSupported(chainId);
  const isPreparing = commitment.isGeneratingNote || gas.isLoading;
  const hasNoteData = !!commitment.noteData;

  // Fee calculations (for display only)
  const amounts = formatDepositAmountsForDisplay(form.amount);

  // Refs for tracking shown txs
  const shownTxsRef = useRef(new Set<string>());

  // Track last error with domain for UI to handle
  const lastError: DepositError = tx.error
    ? { type: "transaction", message: tx.error }
    : gas.error
      ? { type: "gas", message: gas.error }
      : commitment.error
        ? { type: "commitment", message: commitment.error }
        : null;

  // Handle note generation errors (silent retry)
  useEffect(() => {
    if (!commitment.error) return;
    console.warn("Note generation failed, auto-retrying:", commitment.error);
    const timer = setTimeout(() => commitment.regenerateNote(), 1000);
    return () => clearTimeout(timer);
  }, [commitment.error, commitment.regenerateNote]);

  // Handle transaction submission (hash received)
  useEffect(() => {
    if (tx.isSubmitted && tx.transactionHash && !shownTxsRef.current.has(tx.transactionHash)) {
      shownTxsRef.current.add(tx.transactionHash);
      trackTransaction(tx.transactionHash, chainId);

      setTimeout(() => {
        tx.reset();
        form.resetForm();
        onTransactionSuccess?.();
      }, 1000);
    }
  }, [
    tx.isSubmitted,
    tx.transactionHash,
    tx.reset,
    form,
    trackTransaction,
    chainId,
    onTransactionSuccess,
  ]);

  // Actions
  const deposit = () => {
    if (!commitment.noteData || !form.amount || form.amountError) return;
    tx.clearError();
    tx.deposit(form.amount, commitment.noteData);
  };

  const reset = () => {
    form.resetForm();
    tx.reset();
    shownTxsRef.current.clear();
  };

  // Status logic - semantic representation (single source of truth)
  const getStatus = (): DepositStatus => {
    if (tx.isLoading) return "submitting";
    if (!isConnected || !address) return "wallet-disconnected";
    if (commitment.isGeneratingNote || !hasNoteData) return "preparing";
    if (!isOnSupportedChain) return "unsupported-network";
    if (!hasBalance) return "insufficient-balance";
    if (form.amountError) return "invalid-amount";
    if (gas.error) return "gas-estimation-failed";
    if (gas.isLoading) return "estimating-gas";
    if (form.amount.trim() !== "") return "ready";
    return "idle";
  };

  const status = getStatus();
  const canDeposit = status === "ready";

  return {
    // State
    amount: form.amount,
    amountError: form.amountError,
    depositNoteAmount: amounts.noteAmount,
    complianceFee: amounts.complianceFee,
    gasCostEth: gas.gasCostEth,
    isEstimatingGas: gas.isLoading,
    gasEstimationError: gas.error,
    isDepositing: tx.isLoading,
    isPreparing,
    isSubmitted: tx.isSubmitted,
    transactionHash: tx.transactionHash,
    transactionError: tx.error,
    isConnected,
    address,
    balance: formattedBalance,
    hasBalance,
    isOnSupportedChain,
    chainId,
    canDeposit,
    status,
    lastError,

    // Actions
    setAmount: form.handleAmountChange,
    deposit,
    reset,
  };
}
