/**
 * @shinobi-cash/core/deposit
 */

import { createDeriveFn, derivePrecommitment } from "../crypto/primitives.js";
import {
  SHINOBI_CASH_ENTRYPOINT,
  EntrypointDepositAbi,
  SHINOBI_CASH_CROSSCHAIN_CONTRACTS,
  CrosschainDepositEntrypointAbi,
  POOL_CHAIN,
} from "@shinobi-cash/constants";

export { derivePrecommitment };

export const deriveDepositNullifier = createDeriveFn("shinobi.cash:DepositNullifierV1");
export const deriveDepositSecret = createDeriveFn("shinobi.cash:DepositSecretV1");

// ============ DEPOSIT ROUTING ============

export interface DepositRoute {
  address: `0x${string}`;
  abi: readonly unknown[];
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
 * Resolves the deposit route (contract + ABI) for a chain.
 * @throws Error if chain is unsupported
 */
export function resolveDepositRoute(chainId: number): DepositRoute {
  if (chainId === POOL_CHAIN.id) {
    return {
      address: SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`,
      abi: EntrypointDepositAbi,
      functionName: "deposit",
      isCrossChain: false,
      chainId,
    };
  }

  const crosschainContracts = SHINOBI_CASH_CROSSCHAIN_CONTRACTS as Record<
    number,
    (typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS)[keyof typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS]
  >;
  const crosschainContract = crosschainContracts[chainId];

  if (!crosschainContract?.DEPOSIT_ENTRYPOINT?.address) {
    throw new Error(`Unsupported deposit chain: ${chainId}`);
  }

  return {
    address: crosschainContract.DEPOSIT_ENTRYPOINT.address as `0x${string}`,
    abi: CrosschainDepositEntrypointAbi,
    functionName: "deposit",
    isCrossChain: true,
    chainId,
  };
}

/**
 * Builds deposit call arguments based on route and parameters.
 */
export function buildDepositCallParams(
  route: DepositRoute,
  precommitment: bigint,
  settings: DepositSettings,
  useDefaults: boolean
): DepositCallParams {
  if (!route.isCrossChain) {
    return { ...route, args: [precommitment] as const };
  }

  if (useDefaults) {
    return { ...route, functionName: "deposit", args: [precommitment] as const };
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
 * Checks if a chain supports deposits.
 */
export function isDepositSupported(chainId: number): boolean {
  if (chainId === POOL_CHAIN.id) return true;

  const crosschainContracts = SHINOBI_CASH_CROSSCHAIN_CONTRACTS as Record<
    number,
    (typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS)[keyof typeof SHINOBI_CASH_CROSSCHAIN_CONTRACTS]
  >;
  return !!crosschainContracts[chainId]?.DEPOSIT_ENTRYPOINT?.address;
}
