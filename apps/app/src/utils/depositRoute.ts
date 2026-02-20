/**
 * Deposit Route Resolver
 * Single source of truth for deposit contract routing decisions
 */

import {
  SHINOBI_CASH_ENTRYPOINT,
  EntrypointDepositAbi,
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
  CrosschainDepositEntrypointAbi,
  POOL_CHAIN,
} from "@shinobi-cash/constants";
import type { Abi, Address } from "viem";

export interface DepositRoute {
  address: Address;
  abi: Abi;
  functionName: string;
  isCrossChain: boolean;
  chainId: number;
}

export interface DepositCallParams extends DepositRoute {
  args: readonly unknown[];
}

export interface DepositSettings {
  solverFeeBPS: number;
  fillDeadlineSeconds: number;
  expirySeconds: number;
}

/**
 * Resolves the deposit route (contract + ABI) for a chain
 * Does NOT include fees or args - pure routing logic
 * @param chainId - Chain ID where deposit will be executed
 * @returns Deposit route configuration
 * @throws Error if chain is unsupported
 */
export function resolveDepositRoute(chainId: number): DepositRoute {
  const isSameChain = chainId === POOL_CHAIN.id;

  // Same-chain deposit (direct to pool)
  if (isSameChain) {
    return {
      address: SHINOBI_CASH_ENTRYPOINT.address as Address,
      abi: EntrypointDepositAbi,
      functionName: "deposit",
      isCrossChain: false,
      chainId,
    };
  }

  // Cross-chain deposit (via bridge)
  const crosschainContracts = SHINOBI_CASH_CROSSCHAIN_CONTRACTS as Record<
    number,
    (typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS)[keyof typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS]
  >;

  const crosschainContract = crosschainContracts[chainId];

  if (!crosschainContract?.DEPOSIT_ENTRYPOINT?.address) {
    throw new Error(`Unsupported deposit chain: ${chainId}`);
  }

  return {
    address: crosschainContract.DEPOSIT_ENTRYPOINT.address as Address,
    abi: CrosschainDepositEntrypointAbi,
    functionName: "deposit", // Default function, may be overridden in buildDepositCallParams
    isCrossChain: true,
    chainId,
  };
}

/**
 * Builds deposit call arguments based on route and parameters
 * Uses deposit() for defaults, depositWithCustomParams() for custom settings
 * @param route - Deposit route from resolveDepositRoute
 * @param precommitment - Cash note precommitment hash
 * @param settings - Deposit settings (solverFeeBPS, fillDeadline, expiry)
 * @param useDefaults - If true, use simple deposit() with contract defaults
 * @returns Complete call parameters with args
 */
export function buildDepositCallParams(
  route: DepositRoute,
  precommitment: bigint,
  settings: DepositSettings,
  useDefaults: boolean
): DepositCallParams {
  // Same-chain always uses simple deposit
  if (!route.isCrossChain) {
    return {
      ...route,
      args: [precommitment] as const,
    };
  }

  // Cross-chain: use deposit() for defaults, depositWithCustomParams() for custom
  if (useDefaults) {
    return {
      ...route,
      functionName: "deposit",
      args: [precommitment] as const,
    };
  }

  return {
    ...route,
    functionName: "depositWithCustomParams",
    args: [
      precommitment,
      BigInt(settings.solverFeeBPS),
      settings.fillDeadlineSeconds,
      settings.expirySeconds,
    ] as const,
  };
}

/**
 * Checks if a chain supports deposits
 * @param chainId - Chain ID to check
 * @returns True if deposits are supported on this chain
 */
export function isDepositSupported(chainId: number): boolean {
  if (chainId === POOL_CHAIN.id) return true;

  const crosschainContracts = SHINOBI_CASH_CROSSCHAIN_CONTRACTS as Record<
    number,
    (typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS)[keyof typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS]
  >;

  return !!crosschainContracts[chainId]?.DEPOSIT_ENTRYPOINT?.address;
}
