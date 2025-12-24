/**
 * Withdrawal Proof Generation Hook
 * Handles ZK proof generation for privacy-preserving withdrawals
 */

import { useState, useCallback } from "react";
import type { Note } from "@/lib/storage/types";
import type { PreparedWithdrawal, WithdrawalRequest } from "@/services/withdrawal/types";
import { processWithdrawal } from "@/services/withdrawal/withdrawalService";

interface ProofState {
  preparedWithdrawal: PreparedWithdrawal | null;
  isGenerating: boolean;
  error: string | null;
}

export function useWithdrawProof() {
  const [state, setState] = useState<ProofState>({
    preparedWithdrawal: null,
    isGenerating: false,
    error: null,
  });

  /**
   * Generate ZK proof for withdrawal
   * @returns PreparedWithdrawal or throws error
   */
  const generateProof = useCallback(
    async (
      note: Note,
      withdrawAmount: string,
      recipientAddress: string,
      accountKey: bigint,
      destinationChainId?: number
    ): Promise<PreparedWithdrawal> => {
      setState((prev) => ({
        ...prev,
        isGenerating: true,
        error: null,
        preparedWithdrawal: null,
      }));

      try {
        const withdrawalRequest: WithdrawalRequest = {
          note,
          withdrawAmount,
          recipientAddress,
          accountKey,
          destinationChainId,
        };

        const prepared = await processWithdrawal(withdrawalRequest);

        setState({
          preparedWithdrawal: prepared,
          isGenerating: false,
          error: null,
        });

        return prepared;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to generate proof";

        setState({
          preparedWithdrawal: null,
          isGenerating: false,
          error: errorMessage,
        });

        throw err;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      preparedWithdrawal: null,
      isGenerating: false,
      error: null,
    });
  }, []);

  return {
    preparedWithdrawal: state.preparedWithdrawal,
    isGenerating: state.isGenerating,
    proofError: state.error,
    generateProof,
    reset,
  };
}
