/**
 * Contract read operations.
 * Ported from apps/app/src/utils/withdrawalContract.ts (fetchPoolScope)
 */

import {
  PoolScopeAbi,
  POOL_CHAIN,
  SHINOBI_CASH_ETH_POOL,
} from "@shinobi-cash/constants";
import { createPublicClient, http } from "viem";
import { getViemChain } from "./chains.js";

export async function fetchPoolScope(rpcUrl?: string): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: getViemChain(POOL_CHAIN.id),
    transport: http(rpcUrl),
  });

  const scope = (await publicClient.readContract({
    address: SHINOBI_CASH_ETH_POOL.address as `0x${string}`,
    abi: PoolScopeAbi,
    functionName: "SCOPE",
  })) as bigint;

  return scope;
}
