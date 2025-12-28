/**
 * Gas Estimation Utilities for Withdrawals
 *
 * Provides functions to estimate gas costs and calculate optimal relayFeeBPS
 * before proof generation to avoid circular dependencies.
 */

import { formatEther, parseEther } from "viem";
import {
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
  WITHDRAWAL_CONFIG,
} from "../constants";

/**
 * Fixed solver fee for cross-chain withdrawals (5%)
 * This incentivizes solvers to fill orders on destination chain
 */
const SOLVER_FEE_BPS = 500;

/**
 * Gas price information from Pimlico bundler
 */
export interface GasPrice {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

/**
 * Result of gas estimation
 */
export interface GasEstimation {
  totalGas: bigint;
  estimatedGasCost: bigint; // In wei
  estimatedGasCostEth: string; // In ETH (formatted)
}

/**
 * Result of relayFeeBPS calculation
 */
export interface RelayFeeCalculation {
  calculatedBPS: number; // Calculated BPS based on gas cost
  actualBPS: number; // Actual BPS to use (capped at maxRelayFeeBPS)
  maxBPS: number; // Maximum allowed BPS
  estimatedFee: bigint; // Fee in wei based on actualBPS
  estimatedFeeEth: string; // Fee in ETH (formatted)
  isWithinLimit: boolean; // Whether calculated BPS is within max limit
}

/**
 * Calculate total gas required for a withdrawal UserOperation
 *
 * @param isCrossChain - Whether this is a cross-chain withdrawal
 * @returns Total gas units needed
 */
export function calculateTotalGas(isCrossChain: boolean = false): bigint {
  const gasLimits = isCrossChain ? CROSS_CHAIN_GAS_LIMITS : SAME_CHAIN_GAS_LIMITS;

  const {
    CALL_GAS_LIMIT,
    VERIFICATION_GAS_LIMIT,
    PRE_VERIFICATION_GAS,
    PAYMASTER_VERIFICATION_GAS_LIMIT,
    POST_OP_GAS_LIMIT,
  } = gasLimits;

  return (
    CALL_GAS_LIMIT +
    VERIFICATION_GAS_LIMIT +
    PRE_VERIFICATION_GAS +
    PAYMASTER_VERIFICATION_GAS_LIMIT +
    POST_OP_GAS_LIMIT
  );
}

/**
 * Estimate the gas cost for a withdrawal operation
 *
 * @param gasPrice - Current gas price from bundler
 * @param isCrossChain - Whether this is a cross-chain withdrawal
 * @returns Gas estimation details
 */
export function estimateGasCost(gasPrice: GasPrice, isCrossChain: boolean = false): GasEstimation {
  const totalGas = calculateTotalGas(isCrossChain);
  const estimatedGasCost = totalGas * gasPrice.maxFeePerGas;

  return {
    totalGas,
    estimatedGasCost,
    estimatedGasCostEth: formatEther(estimatedGasCost),
  };
}

/**
 * Calculate optimal relayFeeBPS based on withdrawal amount and gas cost
 *
 * This ensures the paymaster receives enough to cover gas costs while
 * staying within the contract's maxRelayFeeBPS limit.
 *
 * @param withdrawAmount - Amount user is withdrawing (in ETH string, e.g., "0.5")
 * @param gasEstimation - Gas cost estimation
 * @returns Relay fee calculation result
 */
export function calculateRelayFeeBPS(
  withdrawAmount: string,
  gasEstimation: GasEstimation
): RelayFeeCalculation {
  const withdrawAmountWei = parseEther(withdrawAmount);
  const { estimatedGasCost } = gasEstimation;
  const maxBPS = WITHDRAWAL_CONFIG.MAX_RELAY_FEE_BPS;

  // Calculate minimum BPS needed to cover gas cost
  // Formula: BPS = (gasCost / withdrawAmount) * 10000
  const calculatedBPS = Number((estimatedGasCost * BigInt(10000)) / withdrawAmountWei);

  // Cap at maxRelayFeeBPS to ensure contract validation passes
  const actualBPS = Math.min(Math.ceil(calculatedBPS), maxBPS);

  // Calculate the actual fee based on actualBPS
  const estimatedFee = (withdrawAmountWei * BigInt(actualBPS)) / BigInt(10000);

  return {
    calculatedBPS,
    actualBPS,
    maxBPS,
    estimatedFee,
    estimatedFeeEth: formatEther(estimatedFee),
    isWithinLimit: calculatedBPS <= maxBPS,
  };
}

/**
 * Calculate the net amount user will receive after fees
 *
 * @param withdrawAmount - Amount user is withdrawing (in ETH string)
 * @param relayFeeCalculation - Relay fee calculation result
 * @returns Net amount in wei and ETH
 */
export function calculateNetAmount(
  withdrawAmount: string,
  relayFeeCalculation: RelayFeeCalculation
): {
  netAmountWei: bigint;
  netAmountEth: string;
} {
  const withdrawAmountWei = parseEther(withdrawAmount);
  const netAmountWei = withdrawAmountWei - relayFeeCalculation.estimatedFee;

  return {
    netAmountWei,
    netAmountEth: formatEther(netAmountWei),
  };
}

/**
 * Calculate solver fee for cross-chain withdrawals
 *
 * @param withdrawAmount - Amount user is withdrawing (in ETH string)
 * @param isCrossChain - Whether this is a cross-chain withdrawal
 * @returns Solver fee calculation
 */
export function calculateSolverFee(
  withdrawAmount: string,
  isCrossChain: boolean
): {
  solverFeeBPS: number;
  solverFee: bigint;
  solverFeeEth: string;
} {
  if (!isCrossChain) {
    return {
      solverFeeBPS: 0,
      solverFee: BigInt(0),
      solverFeeEth: "0",
    };
  }

  const withdrawAmountWei = parseEther(withdrawAmount);
  const solverFee = (withdrawAmountWei * BigInt(SOLVER_FEE_BPS)) / BigInt(10000);

  return {
    solverFeeBPS: SOLVER_FEE_BPS,
    solverFee,
    solverFeeEth: formatEther(solverFee),
  };
}

/**
 * Complete withdrawal fee estimation pipeline
 *
 * Given withdrawal amount and gas price, calculates:
 * - Total gas needed
 * - Estimated gas cost
 * - Optimal relayFeeBPS (for gas)
 * - Solver fee (for cross-chain)
 * - Net amount user receives
 *
 * @param withdrawAmount - Amount user is withdrawing (in ETH string)
 * @param gasPrice - Current gas price from bundler
 * @param isCrossChain - Whether this is a cross-chain withdrawal
 * @returns Complete fee breakdown
 */
export function estimateWithdrawalFees(
  withdrawAmount: string,
  gasPrice: GasPrice,
  isCrossChain: boolean = false
) {
  const gasEstimation = estimateGasCost(gasPrice, isCrossChain);
  const relayFeeCalculation = calculateRelayFeeBPS(withdrawAmount, gasEstimation);
  const solverFeeCalculation = calculateSolverFee(withdrawAmount, isCrossChain);

  // Calculate net amount after both relay and solver fees
  const withdrawAmountWei = parseEther(withdrawAmount);
  const totalFees = relayFeeCalculation.estimatedFee + solverFeeCalculation.solverFee;
  const netAmountWei = withdrawAmountWei - totalFees;

  return {
    gasEstimation,
    relayFeeCalculation,
    solverFeeCalculation,
    netAmount: {
      netAmountWei,
      netAmountEth: formatEther(netAmountWei),
    },
    totalFees: {
      totalFeesWei: totalFees,
      totalFeesEth: formatEther(totalFees),
    },
  };
}
