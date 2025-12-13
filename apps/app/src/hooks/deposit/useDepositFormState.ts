import { useCallback, useState } from "react";
import { formatEther, parseEther } from "viem";

interface UseDepositFormStateProps {
  availableBalance: bigint;
}

export function useDepositFormState({ availableBalance }: UseDepositFormStateProps) {
  const [amount, setAmount] = useState("");

  const validateAmount = useCallback(
    (value: string): string => {
      if (!value.trim()) return "Please enter an amount";
      try {
        const parsed = parseEther(value);
        if (parsed <= BigInt(0)) return "Amount must be positive";
        if (parsed > availableBalance) {
          return `Amount cannot exceed ${formatEther(availableBalance)} ETH`;
        }
        return "";
      } catch {
        return "Please enter a valid amount";
      }
    },
    [availableBalance],
  );

  const amountError = amount ? validateAmount(amount) : "";

  const handleAmountChange = useCallback((value: string) => {
    setAmount(value);
  }, []);

  const resetForm = useCallback(() => {
    setAmount("");
  }, []);

  return {
    amount,
    amountError,
    handleAmountChange,
    resetForm,
    validateAmount,
  };
}
