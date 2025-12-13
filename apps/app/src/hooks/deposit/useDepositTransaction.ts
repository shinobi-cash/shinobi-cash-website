import {
  ShinobiCashEntrypointAbi,
  ShinobiCrosschainDepositEntrypointAbi,
  DEPOSIT_FEES,
  SHINOBI_CASH_ENTRYPOINT,
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
  POOL_CHAIN,
  SUPPORTED_CROSSCHAIN
} from "@shinobi-cash/constants";
import type { CashNoteData } from "@/lib/services/DepositService";
import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useChainId } from "wagmi";

interface DepositState {
  isSuccess: boolean;
  error: string | null;
}

export function useDepositTransaction() {
  const chainId = useChainId();
  const [state, setState] = useState<DepositState>({
    isSuccess: false,
    error: null,
  });

  const { writeContract, data: hash, isPending: isLoading, error: writeError } = useWriteContract();

  const deposit = (amount: string, cashNoteData: CashNoteData) => {
    setState((prev) => ({
      ...prev,
      error: null,
      isSuccess: false,
    }));

    const amountWei = parseEther(amount);
    const precommitmentBigInt = cashNoteData.precommitment;

    if (chainId === POOL_CHAIN.id) {
      // Same-chain deposit (Arbitrum Sepolia → Arbitrum Sepolia Pool)
      writeContract({
        address: SHINOBI_CASH_ENTRYPOINT.address,
        abi: ShinobiCashEntrypointAbi,
        functionName: "deposit",
        args: [precommitmentBigInt],
        value: amountWei,
      });
    } else if (SUPPORTED_CROSSCHAIN.map(chain => chain.id).includes(chainId)) {
      // Cross-chain deposit (e.g., Base Sepolia → Arbitrum Sepolia Pool via OIF)
      // Use depositWithCustomFee to explicitly set solver fee (5% default)
      const crosschainContracts = SHINOBI_CASH_CROSSCHAIN_CONTRACTS as Record<number, typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS[keyof typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS]>;
      const crosschainContract = crosschainContracts[chainId];

      if (!crosschainContract?.DEPOSIT_ENTRYPOINT) {
        setState((prev) => ({
          ...prev,
          error: `Cross-chain deposits not supported on chain ${chainId}`,
          isSuccess: false,
        }));
        return;
      }

      writeContract({
        address: crosschainContract.DEPOSIT_ENTRYPOINT.address,
        abi: ShinobiCrosschainDepositEntrypointAbi,
        functionName: "depositWithCustomFee",
        args: [precommitmentBigInt, BigInt(DEPOSIT_FEES.DEFAULT_SOLVER_FEE_BPS)],
        value: amountWei,
      });
    } else {
      setState((prev) => ({
        ...prev,
        error: "Invalid deposit type configuration",
        isSuccess: false,
      }));
    }
  };

  // Handle transaction success
  useEffect(() => {
    if (hash) {
      setState((prev) => ({
        ...prev,
        isSuccess: true,
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
        isSuccess: false,
      }));
    }
  }, [writeError]);

  const reset = useCallback(() => {
    setState({
      isSuccess: false,
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
