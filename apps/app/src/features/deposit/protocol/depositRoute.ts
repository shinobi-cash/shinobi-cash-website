/**
 * Deposit Route Resolver
 * Single source of truth for deposit contract routing decisions
 */

import {
  SHINOBI_CASH_ENTRYPOINT,
  ShinobiCashEntrypointAbi,
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
  ShinobiCrosschainDepositEntrypointAbi,
  DEPOSIT_FEES,
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
      abi: ShinobiCashEntrypointAbi,
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
    abi: ShinobiCrosschainDepositEntrypointAbi,
    functionName: "depositWithCustomFee",
    isCrossChain: true,
    chainId,
  };
}

/**
 * Builds deposit call arguments based on route and parameters
 * Separates fee policy from routing logic
 * @param route - Deposit route from resolveDepositRoute
 * @param precommitment - Cash note precommitment hash
 * @param solverFeeBps - Solver fee in basis points (only for cross-chain)
 * @returns Complete call parameters with args
 */
export function buildDepositCallParams(
  route: DepositRoute,
  precommitment: bigint,
  solverFeeBps: number = DEPOSIT_FEES.DEFAULT_SOLVER_FEE_BPS
): DepositCallParams {
  if (route.isCrossChain) {
    return {
      ...route,
      args: [precommitment, BigInt(solverFeeBps)] as const,
    };
  }

  return {
    ...route,
    args: [precommitment] as const,
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
