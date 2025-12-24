import { useConfig, useChainId, useGasPrice } from "wagmi";
import { formatEther, parseEther } from "viem";
import { useEffect, useState } from "react";
import type { CashNoteData } from "@/features/deposit/services/DepositService";
import { estimateContractGas } from "viem/actions";
import { resolveDepositRoute, buildDepositCallParams } from "../protocol/depositRoute";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

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

  // Debounce amount to prevent excessive RPC calls while typing
  const debouncedAmount = useDebouncedValue(amount, 300);

  const [estimate, setEstimate] = useState({
    gasCostEth: "0",
    gasCostWei: null as bigint | null,
    isLoading: false,
    error: null as string | null,
  });

  useEffect(() => {
    async function getGas() {
      if (!debouncedAmount || !cashNoteData || !gasPrice) return;

      setEstimate((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const publicClient = config.getClient({ chainId });
        const route = resolveDepositRoute(chainId);
        const callParams = buildDepositCallParams(route, cashNoteData.precommitment);
        const valueWei = parseEther(debouncedAmount);

        const gasLimit = await estimateContractGas(publicClient, {
          address: callParams.address,
          abi: callParams.abi,
          functionName: callParams.functionName,
          args: callParams.args,
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
        const errorMessage =
          err instanceof Error ? err.message : "Estimation failed - check balance";

        setEstimate((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }

    getGas();
  }, [debouncedAmount, cashNoteData, gasPrice, chainId, config]);

  return estimate;
}
