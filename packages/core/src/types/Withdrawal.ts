/**
 * Withdrawal Type Definitions
 *
 * Types for generating withdrawal proofs and managing withdrawal flow
 */

import type { Note } from './Note.js';

/**
 * Type of withdrawal operation
 */
export type WithdrawalKind = 'same-chain' | 'cross-chain';

/**
 * Fee quote for a withdrawal operation
 */
export interface FeeQuote {
  /** Type of withdrawal */
  kind: WithdrawalKind;

  /** Relay fee in basis points */
  relayFeeBPS: number;

  /** Solver fee in basis points (cross-chain only) */
  solverFeeBPS: number;

  /** Execution/relay fee in wei */
  executionFeeWei: bigint;

  /** Solver fee in wei */
  solverFeeWei: bigint;

  /** Total fees in wei */
  totalFeeWei: bigint;

  /** Net amount after fees in wei */
  netAmountWei: bigint;

  /** Gas price used for fee calculation */
  gasPrice: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
}

/**
 * Request for a withdrawal operation
 */
export interface WithdrawalRequest {
  /** Note to withdraw from */
  note: Note;

  /** Amount to withdraw in wei */
  withdrawAmountWei: bigint;

  /** Recipient address (hex) */
  recipient: `0x${string}`;

  /** Account key for deriving nullifiers and secrets */
  accountKey: bigint;

  /** Destination chain ID for cross-chain withdrawals */
  destinationChainId?: number;
}

/**
 * Context data for generating a same-chain withdrawal proof
 */
export interface WithdrawalContext {
  /** State tree leaves (all commitments in the pool) */
  stateTreeLeaves: StateTreeLeaf[];

  /** ASP approval data */
  aspData: ASPData;

  /** Pool scope (context identifier) */
  poolScope: string;

  /** Withdrawal data structure */
  withdrawalData: readonly [string, string];

  /** Context hash for the withdrawal */
  context: bigint;

  /** New nullifier for change note */
  newNullifier: bigint;

  /** New secret for change note */
  newSecret: bigint;

  /** Existing nullifier being spent */
  existingNullifier: bigint;

  /** Existing secret being spent */
  existingSecret: bigint;
}

/**
 * Context data for generating a cross-chain withdrawal proof
 */
export interface CrosschainWithdrawalContext {
  /** State tree leaves (all commitments in the pool) */
  stateTreeLeaves: StateTreeLeaf[];

  /** ASP approval data */
  aspData: ASPData;

  /** Pool scope (context identifier) */
  poolScope: string;

  /** Withdrawal data structure */
  withdrawalData: readonly [string, string];

  /** Context hash for the withdrawal */
  context: bigint;

  /** New nullifier for change note */
  newNullifier: bigint;

  /** New secret for change note */
  newSecret: bigint;

  /** Refund nullifier for failed withdrawal */
  refundNullifier: bigint;

  /** Refund secret for failed withdrawal */
  refundSecret: bigint;

  /** Existing nullifier being spent */
  existingNullifier: bigint;

  /** Existing secret being spent */
  existingSecret: bigint;
}

/**
 * ZK proof data in Groth16 format
 */
export interface WithdrawalProofData {
  /** Groth16 proof components */
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };

  /** Public signals for proof verification */
  publicSignals: string[];
}

/**
 * State tree leaf from indexer
 */
export interface StateTreeLeaf {
  /** Leaf index in the tree */
  leafIndex: string;

  /** Leaf value (commitment) */
  leafValue: string;

  /** Tree root at this leaf */
  treeRoot: string;

  /** Tree size at this leaf */
  treeSize: string;

  /** Pool address */
  poolAddress: string;
}

/**
 * ASP (Association Set of Participants) approval data
 */
export interface ASPData {
  /** Merkle root of approved labels */
  root: string;

  /** IPFS CID containing approval list */
  ipfsCID: string;

  /** Timestamp of approval */
  timestamp: string;

  /** List of approved labels */
  approvalList: string[];
}

