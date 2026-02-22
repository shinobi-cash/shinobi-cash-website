/**
 * Withdrawal Chain Config Fetcher
 * Fetches per-destination-chain timing config from the entrypoint contract
 */

import { readContract } from "viem/actions";
import {
  SHINOBI_CASH_ENTRYPOINT,
  WithdrawalChainConfigAbi,
  POOL_CHAIN,
} from "@shinobi-cash/constants";
import { createPublicClient, http } from "viem";

export interface WithdrawalChainConfig {
  fillDeadlineSeconds: number;
  expirySeconds: number;
}

// Cache config per destination chain
const configCache = new Map<number, WithdrawalChainConfig>();

/**
 * Fetch withdrawal chain config from entrypoint contract
 * Results are cached per destination chain
 */
export async function fetchWithdrawalChainConfig(
  destinationChainId: number
): Promise<WithdrawalChainConfig> {
  const cached = configCache.get(destinationChainId);
  if (cached) return cached;

  const publicClient = createPublicClient({
    chain: POOL_CHAIN as never,
    transport: http(),
  });

  const result = await readContract(publicClient, {
    address: SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`,
    abi: WithdrawalChainConfigAbi,
    functionName: "withdrawalChainConfig",
    args: [BigInt(destinationChainId)],
  });

  const [isConfigured, fillDeadline, expiry] = result as [boolean, number, number, string, string, string];

  if (!isConfigured) {
    throw new Error(`Withdrawal chain config not found for chain ${destinationChainId}`);
  }

  const config: WithdrawalChainConfig = {
    fillDeadlineSeconds: Number(fillDeadline),
    expirySeconds: Number(expiry),
  };

  configCache.set(destinationChainId, config);

  return config;
}
