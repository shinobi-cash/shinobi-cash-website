/**
 * Deposit Controller Hook
 * Single orchestrator for the entire deposit feature
 * - Manages all deposit state
 * - Coordinates hooks and services
 * - Provides simple API to UI
 */

import { storageManager } from "@/lib/storage";
import { parseUserKey } from "@shinobi-cash/core";
import { useAccount, useBalance, useChainId } from "wagmi";
import { useDepositFormState } from "../hooks/useDepositFormState";
import { useDepositCommitment } from "../hooks/useDepositCommitment";
import { useDepositGasEstimate } from "../hooks/useDepositGasEstimate";
import { useDepositTransaction } from "../hooks/useDepositTransaction";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { formatEther } from "viem";
import { formatDepositAmountsForDisplay } from "../protocol/depositFees";
import { isDepositSupported } from "../protocol/depositRoute";
import { useEffect, useRef, useState } from "react";
import type { DepositStatus, DepositError } from "../types/depositStatus";

interface Asset {
  symbol: string;
  name: string;
  icon: string;
}

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
  // Wallet
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { trackTransaction } = useTransactionTracking();

  const availableBalance = balance?.value ?? BigInt(0);
  const hasBalance = availableBalance > BigInt(0);
  const formattedBalance = balance?.value ? formatEther(balance.value) : "0";

  // ---------- CRYPTO CONTEXT (FROM STORAGE, NOT AUTH STORE) ----------
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
        console.error("[DepositController] Failed to load crypto context:", err);
      }
    }

    loadCrypto();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- CORE HOOKS ----------
  const form = useDepositFormState({ availableBalance });

  const commitment = useDepositCommitment(
    cryptoRef.current.publicKey,
    cryptoRef.current.accountKey
  );

  const gas = useDepositGasEstimate(form.amount, commitment.noteData);
  const tx = useDepositTransaction();

  // ---------- DERIVED STATE ----------
  const isOnSupportedChain = isDepositSupported(chainId);
  const isPreparing = !cryptoReady || commitment.isGeneratingNote || gas.isLoading;
  const hasNoteData = !!commitment.noteData;

  const amounts = formatDepositAmountsForDisplay(form.amount);

  const shownTxsRef = useRef(new Set<string>());

  const lastError: DepositError =
    tx.error
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
    if (
      tx.isSubmitted &&
      tx.transactionHash &&
      !shownTxsRef.current.has(tx.transactionHash)
    ) {
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
    canDeposit,
    status,
    lastError,

    setAmount: form.handleAmountChange,
    deposit,
    reset,
  };
}
