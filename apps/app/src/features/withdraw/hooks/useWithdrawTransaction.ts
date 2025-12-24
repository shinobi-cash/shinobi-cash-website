/**
 * Withdrawal Transaction Hook
 * Handles UserOperation execution for withdrawals
 */

import { useState, useCallback } from "react";
import type { PreparedWithdrawal } from "@/services/withdrawal/types";
import { executePreparedWithdrawal } from "@/services/withdrawal/withdrawalService";

interface TransactionState {
  transactionHash: string | null;
  isSubmitted: boolean; // Hash received, not necessarily confirmed
  isExecuting: boolean;
  error: string | null;
}

export function useWithdrawTransaction() {
  const [state, setState] = useState<TransactionState>({
    transactionHash: null,
    isSubmitted: false,
    isExecuting: false,
    error: null,
  });

  /**
   * Execute prepared withdrawal transaction
   * @param preparedWithdrawal - Prepared withdrawal from proof generation
   * @returns Transaction hash
   */
  const executeWithdrawal = useCallback(
    async (preparedWithdrawal: PreparedWithdrawal): Promise<string> => {
      setState((prev) => ({
        ...prev,
        isExecuting: true,
        error: null,
        isSubmitted: false,
      }));

      try {
        const transactionHash = await executePreparedWithdrawal(preparedWithdrawal);

        setState({
          transactionHash,
          isSubmitted: true, // Hash received, not necessarily confirmed
          isExecuting: false,
          error: null,
        });

        return transactionHash;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to execute withdrawal";

        setState((prev) => ({
          ...prev,
          isExecuting: false,
          error: errorMessage,
          isSubmitted: false,
        }));

        throw err;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      transactionHash: null,
      isSubmitted: false,
      isExecuting: false,
      error: null,
    });
  }, []);

  return {
    transactionHash: state.transactionHash,
    isSubmitted: state.isSubmitted,
    isExecuting: state.isExecuting,
    transactionError: state.error,
    executeWithdrawal,
    reset,
  };
}
