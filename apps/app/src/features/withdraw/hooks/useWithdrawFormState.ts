/**
 * Withdrawal Form State Hook
 * Handles form inputs and validation
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { isAddress, parseEther } from "viem";
import type { Note } from "@/lib/storage/types";
import { formatEthAmount } from "@/utils/formatters";
import { POOL_CHAIN_ID } from "@/config/chains";

interface FormState {
  withdrawAmount: string;
  recipientAddress: string;
  destinationChainId: number;
}

interface ValidationErrors {
  amount: string | null;
  address: string | null;
}

export function useWithdrawFormState(selectedNote: Note | null, assetSymbol: string) {
  const [form, setForm] = useState<FormState>({
    withdrawAmount: "",
    recipientAddress: "",
    destinationChainId: POOL_CHAIN_ID,
  });

  const [errors, setErrors] = useState<ValidationErrors>({
    amount: null,
    address: null,
  });

  // Calculate available balance from selected note
  const availableBalance = useMemo(
    () => (selectedNote ? parseFloat(formatEthAmount(selectedNote.amount)) : 0),
    [selectedNote]
  );

  // ============ VALIDATION ============

  const validateAmount = useCallback(
    (value: string): string | null => {
      if (!selectedNote) return "Please select a note first";
      if (!value.trim()) return null; // Empty is valid (not yet filled)

      try {
        const parsed = parseEther(value);
        if (parsed <= BigInt(0)) return "Amount must be positive";

        const num = parseFloat(value);
        if (num > availableBalance) {
          return `Amount cannot exceed ${formatEthAmount(selectedNote.amount)} ${assetSymbol}`;
        }

        return null;
      } catch {
        return "Please enter a valid amount";
      }
    },
    [availableBalance, selectedNote, assetSymbol]
  );

  const validateAddress = useCallback((value: string): string | null => {
    if (!value.trim()) return null; // Empty is valid (not yet filled)
    if (!isAddress(value)) return "Please enter a valid Ethereum address";
    return null;
  }, []);

  // ============ HANDLERS ============

  const handleAmountChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, withdrawAmount: value }));
      setErrors((prev) => ({
        ...prev,
        amount: validateAmount(value),
      }));
    },
    [validateAmount]
  );

  const handleAddressChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, recipientAddress: value }));
      setErrors((prev) => ({
        ...prev,
        address: validateAddress(value),
      }));
    },
    [validateAddress]
  );

  const handleDestinationChainChange = useCallback((chainId: number) => {
    setForm((prev) => ({
      ...prev,
      destinationChainId: chainId,
      // Clear address when switching chains for better UX
      recipientAddress: chainId !== POOL_CHAIN_ID ? "" : prev.recipientAddress,
    }));
    // Clear address validation error when switching chains
    setErrors((prev) => ({ ...prev, address: null }));
  }, []);

  const handleMaxClick = useCallback(() => {
    if (!selectedNote) return;
    const maxValue = availableBalance.toString();
    setForm((prev) => ({ ...prev, withdrawAmount: maxValue }));
    setErrors((prev) => ({
      ...prev,
      amount: validateAmount(maxValue),
    }));
  }, [availableBalance, validateAmount, selectedNote]);

  const reset = useCallback(() => {
    setForm((prev) => ({
      withdrawAmount: "",
      recipientAddress: "",
      destinationChainId: prev.destinationChainId, // Keep chain selection
    }));
    setErrors({ amount: null, address: null });
  }, []);

  // Re-validate amount when selected note changes
  useEffect(() => {
    if (form.withdrawAmount && selectedNote) {
      setErrors((prev) => ({
        ...prev,
        amount: validateAmount(form.withdrawAmount),
      }));
    }
  }, [selectedNote, form.withdrawAmount, validateAmount]);

  return {
    // State
    amount: form.withdrawAmount,
    recipientAddress: form.recipientAddress,
    destinationChainId: form.destinationChainId,
    amountError: errors.amount,
    addressError: errors.address,
    availableBalance,

    // Actions
    setAmount: handleAmountChange,
    setRecipientAddress: handleAddressChange,
    setDestinationChain: handleDestinationChainChange,
    setMax: handleMaxClick,
    reset,
  };
}
