/**
 * Deposit Controller Hook
 * Single orchestrator for the entire deposit feature
 * - Manages all deposit state
 * - Coordinates hooks and services
 * - Provides simple API to UI
 */

import { useAccount, useBalance, useChainId } from "wagmi";
import { useCryptoContext } from "@/hooks/useCryptoContext";
import { useDepositFormState } from "../hooks/useDepositFormState";
import { useDepositCommitment } from "../hooks/useDepositCommitment";
import { useDepositGasEstimate } from "../hooks/useDepositGasEstimate";
import { useDepositTransaction } from "../hooks/useDepositTransaction";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { formatEther } from "viem";
import { formatDepositAmountsForDisplay } from "../protocol/depositFees";
import { isDepositSupported } from "../protocol/depositRoute";
import { useEffect, useRef, useMemo } from "react";
import { DEPOSIT_FEES, POOL_CHAIN } from "@shinobi-cash/constants";
import type { DepositStatus, DepositError } from "../types/depositStatus";

interface DepositControllerState {
  amount: string;
  amountError: string | null;

  depositNoteAmount: number;
  complianceFee: number;

  gasCostEth: string;
  isEstimatingGas: boolean;
  gasEstimationError: string | null;

  isDepositing: boolean;
  isPreparing: boolean;
  isSubmitted: boolean;
  transactionHash: string | undefined;
  transactionError: string | null;

  isConnected: boolean;
  address: string | undefined;
  balance: string;
  hasBalance: boolean;

  isOnSupportedChain: boolean;
  chainId: number;
  isCrossChain: boolean;
  solverFee: number;

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

export function useDepositController(): DepositController {
  // Wallet
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { trackTransaction } = useTransactionTracking();

  const availableBalance = balance?.value ?? BigInt(0);
  const hasBalance = availableBalance > BigInt(0);
  const formattedBalance = balance?.value ? formatEther(balance.value) : "0";

  // ---------- CRYPTO CONTEXT (FROM STORAGE, NOT AUTH STORE) ----------
  const { publicKey, accountKey, cryptoReady } = useCryptoContext();

  // ---------- CORE HOOKS ----------
  const form = useDepositFormState({ availableBalance });

  const commitment = useDepositCommitment(publicKey, accountKey);

  const gas = useDepositGasEstimate(form.amount, commitment.noteData);
  const tx = useDepositTransaction();

  // ---------- DERIVED STATE ----------
  const isOnSupportedChain = isDepositSupported(chainId);
  const isPreparing = !cryptoReady || commitment.isGeneratingNote || gas.isLoading;
  const hasNoteData = !!commitment.noteData;

  const amounts = formatDepositAmountsForDisplay(form.amount);

  // Calculate if this is a cross-chain deposit and solver fee
  const isCrossChain = useMemo(() => chainId !== POOL_CHAIN.id, [chainId]);
  const solverFee = useMemo(() => {
    if (!isCrossChain || !form.amount) return 0;
    const depositAmount = parseFloat(form.amount) || 0;
    return (depositAmount * DEPOSIT_FEES.DEFAULT_SOLVER_FEE_BPS) / 10_000;
  }, [isCrossChain, form.amount]);

  const shownTxsRef = useRef(new Set<string>());

  const lastError: DepositError = tx.error
    ? { type: "transaction", message: tx.error }
    : gas.error
      ? { type: "gas", message: gas.error }
      : commitment.error
        ? { type: "commitment", message: commitment.error }
        : null;

  // ---------- EFFECTS ----------
  useEffect(() => {
    if (!commitment.error) return;
    const timer = setTimeout(() => commitment.regenerateNote(), 1000);
    return () => clearTimeout(timer);
  }, [commitment.error, commitment.regenerateNote]);

  useEffect(() => {
    if (!tx.transactionHash) return;
    if (shownTxsRef.current.has(tx.transactionHash)) return;

    shownTxsRef.current.add(tx.transactionHash);
    trackTransaction(tx.transactionHash, chainId);
  }, [tx.transactionHash, chainId, trackTransaction]);

  // ---------- ACTIONS ----------
  const deposit = () => {
    if (!cryptoReady || !commitment.noteData || !form.amount || form.amountError) return;
    tx.clearError();
    tx.deposit(form.amount, commitment.noteData);
  };

  const reset = () => {
    form.resetForm();
    tx.reset();
    shownTxsRef.current.clear();
  };

  // ---------- STATUS ----------
  const getStatus = (): DepositStatus => {
    if (!cryptoReady) return "preparing";
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
    isCrossChain,
    solverFee,
    canDeposit,
    status,
    lastError,

    setAmount: form.handleAmountChange,
    deposit,
    reset,
  };
}
