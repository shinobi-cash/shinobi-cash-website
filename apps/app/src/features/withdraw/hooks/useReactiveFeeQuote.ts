/**
 * Reactive Fee Quote Hook
 *
 * Automatically fetches fee quotes as withdrawal parameters change.
 */

import { useState, useEffect } from "react";
import type { Note } from "@shinobi-cash/core";
import type { WithdrawalRequest, FeeQuote } from "../domain/types";
import { quoteFees } from "../services/feeQuoteService";
import { parseEther } from "viem";
import { POOL_CHAIN_ID } from "@/config/chains";

export interface ReactiveFeeQuoteResult {
  feeQuote: FeeQuote | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to reactively fetch fee quotes when withdrawal parameters change
 *
 * @param note - Selected note
 * @param withdrawAmount - Amount to withdraw (in ETH string)
 * @param recipient - Recipient address
 * @param accountKey - Account key for derivations
 * @param destinationChainId - Optional destination chain ID
 * @returns Fee quote state
 */
export function useReactiveFeeQuote(
  note: Note | null,
  withdrawAmount: string,
  recipient: string,
  accountKey: bigint | null,
  destinationChainId?: number
): ReactiveFeeQuoteResult {
  const [feeQuote, setFeeQuote] = useState<FeeQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if missing required params
    if (!note || !withdrawAmount || !recipient || !accountKey) {
      setFeeQuote(null);
      setIsLoading(false);
      return;
    }

    // Skip if amount is invalid
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setFeeQuote(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchQuote() {
      // TypeScript guard - we already checked these above
      if (!note || !accountKey) return;

      try {
        setIsLoading(true);
        setError(null);

        // Create request
        const request: WithdrawalRequest = {
          note,
          withdrawAmountWei: parseEther(withdrawAmount),
          recipient: recipient as `0x${string}`,
          accountKey,
          destinationChainId,
        };

        // Fetch quote
        const quote = await quoteFees(request, POOL_CHAIN_ID);

        if (!cancelled) {
          setFeeQuote(quote);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch fee quote");
          setIsLoading(false);
        }
      }
    }

    fetchQuote();

    return () => {
      cancelled = true;
    };
  }, [note, withdrawAmount, recipient, accountKey, destinationChainId]);

  return { feeQuote, isLoading, error };
}
