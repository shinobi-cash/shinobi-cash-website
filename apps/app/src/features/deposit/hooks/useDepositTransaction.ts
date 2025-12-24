import type { CashNoteData } from "@/features/deposit/services/DepositService";
import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useChainId } from "wagmi";
import { resolveDepositRoute, buildDepositCallParams } from "../protocol/depositRoute";

interface DepositState {
  isSubmitted: boolean; // Hash received, not necessarily confirmed
  error: string | null;
}

export function useDepositTransaction() {
  const chainId = useChainId();
  const [state, setState] = useState<DepositState>({
    isSubmitted: false,
    error: null,
  });

  const { writeContract, data: hash, isPending: isLoading, error: writeError } = useWriteContract();

  const deposit = (amount: string, cashNoteData: CashNoteData) => {
    setState((prev) => ({
      ...prev,
      error: null,
      isSubmitted: false,
    }));

    try {
      const amountWei = parseEther(amount);
      const route = resolveDepositRoute(chainId);
      const callParams = buildDepositCallParams(route, cashNoteData.precommitment);

      writeContract({
        address: callParams.address,
        abi: callParams.abi,
        functionName: callParams.functionName,
        args: callParams.args,
        value: amountWei,
      });
    } catch (error) {
      console.log({ error });
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to resolve deposit route",
        isSubmitted: false,
      }));
    }
  };

  // Handle transaction submission (hash received, not necessarily confirmed)
  useEffect(() => {
    if (hash) {
      setState((prev) => ({
        ...prev,
        isSubmitted: true,
        error: null,
      }));
    }
  }, [hash]);

  // Handle errors
  useEffect(() => {
    const error = writeError;
    if (error) {
      setState((prev) => ({
        ...prev,
        error: error.message,
        isSubmitted: false,
      }));
    }
  }, [writeError]);

  const reset = useCallback(() => {
    setState({
      isSubmitted: false,
      error: null,
    });
  }, []);

  // Clear error when starting new transaction
  const clearError = () => {
    if (state.error) {
      setState((prev) => ({ ...prev, error: null }));
    }
  };

  return {
    deposit,
    reset,
    clearError,
    isLoading,
    transactionHash: hash,
    ...state,
  };
}
