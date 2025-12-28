/**
 * Withdrawal Fee Estimation Hook
 *
 * Fetches gas prices and calculates optimal relayFeeBPS before proof generation
 */

import { useState, useEffect, useMemo } from "react";
import { pimlicoClient } from "@/lib/clients";
import {
  estimateWithdrawalFees,
  type GasPrice,
  type RelayFeeCalculation,
} from "../utils/gasEstimation";

export interface FeeEstimationResult {
  relayFeeBPS: number; // Calculated BPS to use for withdrawal (gas costs)
  solverFeeBPS: number; // Solver fee BPS (cross-chain only)
  executionFeeEth: string; // Relay fee in ETH (gas costs)
  solverFeeEth: string; // Solver fee in ETH (cross-chain only)
  netAmountEth: string; // Net amount user receives in ETH
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to estimate withdrawal fees based on current gas prices
 *
 * @param withdrawAmount - Amount user is withdrawing (in ETH string)
 * @param isCrossChain - Whether this is a cross-chain withdrawal
 * @returns Fee estimation result
 */
export function useWithdrawFeeEstimation(
  withdrawAmount: string,
  isCrossChain: boolean = false
): FeeEstimationResult {
  const [gasPrice, setGasPrice] = useState<GasPrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch gas price from Pimlico bundler
  useEffect(() => {
    let mounted = true;

    async function fetchGasPrice() {
      try {
        setIsLoading(true);
        setError(null);

        const gasPriceData = await pimlicoClient.getUserOperationGasPrice();

        if (!mounted) return;

        // Use "fast" tier for gas price
        setGasPrice({
          maxFeePerGas: gasPriceData.fast.maxFeePerGas,
          maxPriorityFeePerGas: gasPriceData.fast.maxPriorityFeePerGas,
        });
      } catch (err) {
        if (!mounted) return;

        console.error("Failed to fetch gas price:", err);
        setError("Failed to fetch gas price");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchGasPrice();

    return () => {
      mounted = false;
    };
  }, []); // Fetch once on mount

  // Calculate fees when amount, gas price, or cross-chain status changes
  const feeEstimation = useMemo(() => {
    // Return defaults if no gas price or invalid amount
    if (!gasPrice || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      return {
        relayFeeBPS: 500, // Fallback to 5% if estimation not ready
        solverFeeBPS: isCrossChain ? 500 : 0,
        executionFeeEth: "0",
        solverFeeEth: "0",
        netAmountEth: withdrawAmount || "0",
        isLoading,
        error,
      };
    }

    const result = estimateWithdrawalFees(withdrawAmount, gasPrice, isCrossChain);

    return {
      relayFeeBPS: result.relayFeeCalculation.actualBPS,
      solverFeeBPS: result.solverFeeCalculation.solverFeeBPS,
      executionFeeEth: result.relayFeeCalculation.estimatedFeeEth,
      solverFeeEth: result.solverFeeCalculation.solverFeeEth,
      netAmountEth: result.netAmount.netAmountEth,
      isLoading,
      error,
    };
  }, [withdrawAmount, gasPrice, isCrossChain, isLoading, error]);

  return feeEstimation;
}
