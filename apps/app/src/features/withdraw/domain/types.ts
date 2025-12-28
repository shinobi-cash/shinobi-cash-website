/**
 * Withdrawal Domain Types
 *
 * Core types representing the withdrawal pipeline stages.
 * These types are immutable and represent explicit artifacts at each stage.
 */

import type { Note } from "@shinobi-cash/core";
import type {
  WithdrawalDerivation,
  CrosschainWithdrawalDerivation
} from "@shinobi-cash/core";
import type { SmartAccountClient } from "permissionless";
import type { UserOperation } from "viem/account-abstraction";

// ============ WITHDRAWAL CLASSIFICATION ============

/**
 * Classification of withdrawal type
 */
export type WithdrawalKind = "same-chain" | "cross-chain";

// ============ PIPELINE STAGE TYPES ============

/**
 * Stage 1: Initial withdrawal request from user
 */
export interface WithdrawalRequest {
  note: Note;
  withdrawAmountWei: bigint;
  recipient: `0x${string}`;
  accountKey: bigint;
  destinationChainId?: number;
}

/**
 * Stage 2: Fee quote after gas price estimation
 */
export interface FeeQuote {
  kind: WithdrawalKind;
  relayFeeBPS: number;
  solverFeeBPS: number;
  executionFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
  netAmountWei: bigint;
  gasPrice: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
}

/**
 * Stage 3: Withdrawal pipeline context with derivations
 *
 * Note: Renamed from WithdrawalContext to avoid confusion with:
 * - Core crypto WithdrawalDerivation (cryptographic context)
 * - UI-level view models
 */
export interface WithdrawalPipelineContext {
  kind: WithdrawalKind;
  request: WithdrawalRequest;
  feeQuote: FeeQuote;
  poolScope: bigint;
  derivation: WithdrawalDerivation | CrosschainWithdrawalDerivation;
  withdrawalData: readonly [`0x${string}`, `0x${string}`];
}

/**
 * Stage 4: Complete witness for ZK proof generation
 */
export interface WithdrawalWitness {
  context: WithdrawalPipelineContext;
  stateTreeLeaves: bigint[];
  aspTreeLeaves: bigint[];
  circuitInputs: {
    withdrawAmount: bigint;
    noteAmount: bigint;
    label: bigint;
  };
}

/**
 * Stage 5: Generated ZK proof
 */
export interface WithdrawalProof {
  witness: WithdrawalWitness;
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
}

/**
 * Stage 6: Prepared UserOperation ready for execution
 */
export interface PreparedUserOperation {
  context: WithdrawalPipelineContext;
  proof: WithdrawalProof;
  userOperation: UserOperation<"0.7">;
  smartAccountClient: SmartAccountClient;
}

/**
 * Stage 7: Execution result
 */
export interface ExecutionResult {
  transactionHash: string;
  success: boolean;
}

// ============ HELPER TYPES ============

/**
 * External data dependencies
 *
 * Note: poolScope is NOT included here - it's fetched separately in
 * contextService as the single source of truth.
 */
export interface ExternalData {
  stateTreeLeaves: { leafValue: string }[];
  aspData: {
    root: string;
    ipfsCID: string;
    timestamp: string;
    approvalList: string[];
  };
}
