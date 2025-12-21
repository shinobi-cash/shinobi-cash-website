import {
  useConfig,
  useChainId,
  useGasPrice
} from "wagmi";
import {
  formatEther,
  parseEther
} from "viem";
import { useEffect, useState } from "react";
import type { CashNoteData } from "@/lib/services/DepositService";
import {
  SHINOBI_CASH_ENTRYPOINT,
  ShinobiCashEntrypointAbi,
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
  ShinobiCrosschainDepositEntrypointAbi,
  DEPOSIT_FEES,
  POOL_CHAIN
} from "@shinobi-cash/constants";
import { estimateContractGas } from "viem/actions";

const GAS_BUFFER = BigInt(120); // 20% buffer for safety
const DIVISOR = BigInt(100);

interface GasEstimate {
  gasCostEth: string;
  gasCostWei: bigint | null;
  isLoading: boolean;
  error: string | null;
}

export function useDepositGasEstimate(
  amount: string,
  cashNoteData: CashNoteData | null
): GasEstimate {
  const config = useConfig();
  const chainId = useChainId();
  const { data: gasPrice } = useGasPrice();
  
  const [estimate, setEstimate] = useState({
    gasCostEth: "0",
    gasCostWei: null as bigint | null,
    isLoading: false,
    error: null as string | null,
  });

  useEffect(() => {
    async function getGas() {
      if (!amount || !cashNoteData || !gasPrice) return;

      setEstimate(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const publicClient = config.getClient({ chainId });
        const isSameChain = chainId === POOL_CHAIN.id;

        // Type-safe crosschain contracts lookup
        const crosschainContracts = SHINOBI_CASH_CROSSCHAIN_CONTRACTS as Record<
          number,
          typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS[keyof typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS]
        >;

        // Determine contract details
        const address = isSameChain
          ? SHINOBI_CASH_ENTRYPOINT.address
          : crosschainContracts[chainId]?.DEPOSIT_ENTRYPOINT?.address;

        if (!address) {
          throw new Error("Contract address not found for this chain");
        }

        const abi = isSameChain
          ? ShinobiCashEntrypointAbi
          : ShinobiCrosschainDepositEntrypointAbi;

        const functionName = isSameChain ? "deposit" : "depositWithCustomFee";
        const args = isSameChain
          ? [cashNoteData.precommitment]
          : [cashNoteData.precommitment, BigInt(DEPOSIT_FEES.DEFAULT_SOLVER_FEE_BPS)];

        // Perform the actual gas estimation
        const valueWei = parseEther(amount);
        const gasLimit = await estimateContractGas(publicClient, {
          address,
          abi,
          functionName,
          args,
          value: valueWei,
        } as any); // Type assertion needed due to viem's complex type inference

        // Apply buffer and calculate cost
        const bufferedGas = (gasLimit * GAS_BUFFER) / DIVISOR;
        const totalWei = bufferedGas * gasPrice;

        setEstimate({
          gasCostEth: formatEther(totalWei),
          gasCostWei: totalWei,
          isLoading: false,
          error: null,
        });

      } catch (err: unknown) {
        const errorMessage = err instanceof Error
          ? err.message
          : "Estimation failed - check balance";

        setEstimate(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }

    getGas();
  }, [amount, cashNoteData, gasPrice, chainId, config]);

  return estimate;
}