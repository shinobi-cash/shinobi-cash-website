/**
 * Crosschain Deposit Defaults Fetcher
 * Fetches contract configuration from on-chain for accurate default values
 */

import { readContract } from "viem/actions";
import type { PublicClient, Address } from "viem";
import {
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
  CrosschainDepositConfigAbi,
} from "@shinobi-cash/constants";

export interface CrosschainDepositDefaults {
  solverFeeBPS: number;
  fillDeadlineSeconds: number;
  expirySeconds: number;
  maxSolverFeeBPS: number;
}

// Cache defaults per chain
const defaultsCache = new Map<number, CrosschainDepositDefaults>();

/**
 * Fetch crosschain deposit defaults from contract
 * Results are cached per chain
 */
export async function fetchCrosschainDepositDefaults(
  chainId: number,
  publicClient: PublicClient
): Promise<CrosschainDepositDefaults> {
  // Check cache first
  const cached = defaultsCache.get(chainId);
  if (cached) return cached;

  const contracts = SHINOBI_CASH_CROSSCHAIN_CONTRACTS as Record<
    number,
    { DEPOSIT_ENTRYPOINT?: { address: string } }
  >;
  const contract = contracts[chainId];
  if (!contract?.DEPOSIT_ENTRYPOINT?.address) {
    throw new Error(`No crosschain deposit contract for chain ${chainId}`);
  }

  const address = contract.DEPOSIT_ENTRYPOINT.address as Address;

  // Fetch all defaults in parallel
  const [solverFeeBPS, fillDeadline, expiry, maxSolverFee] = await Promise.all([
    readContract(publicClient, {
      address,
      abi: CrosschainDepositConfigAbi,
      functionName: "defaultSolverFeeBPS",
    }),
    readContract(publicClient, {
      address,
      abi: CrosschainDepositConfigAbi,
      functionName: "defaultFillDeadline",
    }),
    readContract(publicClient, {
      address,
      abi: CrosschainDepositConfigAbi,
      functionName: "defaultExpiry",
    }),
    readContract(publicClient, {
      address,
      abi: CrosschainDepositConfigAbi,
      functionName: "maxSolverFeeBPS",
    }),
  ]);

  const defaults: CrosschainDepositDefaults = {
    solverFeeBPS: Number(solverFeeBPS),
    fillDeadlineSeconds: Number(fillDeadline),
    expirySeconds: Number(expiry),
    maxSolverFeeBPS: Number(maxSolverFee),
  };

  // Cache the result
  defaultsCache.set(chainId, defaults);

  return defaults;
}

/**
 * Clear cache (useful for testing or if contract config changes)
 */
export function clearDefaultsCache() {
  defaultsCache.clear();
}
