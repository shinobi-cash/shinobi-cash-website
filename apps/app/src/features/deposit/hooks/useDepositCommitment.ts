/**
 * Deposit Commitment Hook
 * Manages deposit commitment generation with collision detection
 */

import { type CashNoteData, depositService } from "@/lib/services/DepositService";
import type { DepositCommitmentResult } from "@shinobi-cash/core";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { getUserMessage, logError } from "@/lib/errors";

// Legacy type for backwards compatibility
export interface DepositCashNoteResult {
  noteData: CashNoteData | null;
  isGeneratingNote: boolean;
  error: string | null;
  regenerateNote: () => Promise<void>;
}

/**
 * Hook for deposit commitment generation with decoupled storage and business logic
 */
export function useDepositCommitment(
  publicKey: string | null,
  accountKey: bigint | null
): DepositCashNoteResult {
  const { address } = useAccount();

  const [state, setState] = useState<{
    noteData: CashNoteData | null;
    isGeneratingNote: boolean;
    error: string | null;
  }>({
    noteData: null,
    isGeneratingNote: true,
    error: null,
  });

  const generateNewDepositCommitment = useCallback(async () => {
    if (!address || !accountKey || !publicKey) {
      setState((prev) => ({ ...prev, noteData: null, isGeneratingNote: false }));
      return;
    }

    setState((prev) => ({ ...prev, isGeneratingNote: true, error: null }));

    try {
      const poolAddress = SHINOBI_CASH_ETH_POOL.address;

      // Use SDK deposit service
      const result: DepositCommitmentResult = await depositService.generateDepositCommitment(
        accountKey,
        publicKey,
        poolAddress
      );

      // Convert SDK result to legacy CashNoteData format
      const noteData: CashNoteData = {
        poolAddress: result.poolAddress,
        depositIndex: result.depositIndex,
        changeIndex: 0, // Deposits always have changeIndex 0
        precommitment: BigInt(result.precommitment), // SDK returns hex string, convert to bigint
      };

      setState({
        noteData,
        isGeneratingNote: false,
        error: null,
      });
    } catch (error) {
      // Log with context for debugging
      logError(error, {
        action: "generateDepositCommitment",
        component: "useDepositCommitment",
        hasAddress: !!address,
        hasAccountKey: !!accountKey,
      });

      setState({
        noteData: null,
        isGeneratingNote: false,
        error: getUserMessage(error, "Failed to generate deposit commitment"),
      });
    }
  }, [address, accountKey, publicKey]);

  // Auto-generate on mount and when dependencies change - exact logic from original
  useEffect(() => {
    generateNewDepositCommitment();
  }, [generateNewDepositCommitment]);

  return {
    noteData: state.noteData,
    isGeneratingNote: state.isGeneratingNote,
    error: state.error,
    regenerateNote: generateNewDepositCommitment,
  };
}
