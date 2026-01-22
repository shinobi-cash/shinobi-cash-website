/**
 * Withdrawal Circuit Witness Builder
 *
 * Adapter layer that converts pure derivations + indexer data → circuit witness.
 * Still pure (no I/O), but knows about circuit witness shapes and Merkle trees.
 *
 * This layer sits between:
 * - Pure derivation primitives (crypto/withdrawalDerivation.ts)
 * - Circuit execution (zk/WithdrawalProofGenerator.ts)
 */

import { LeanIMT, type LeanIMTMerkleProof } from '@zk-kit/lean-imt';
import { poseidon2 } from 'poseidon-lite';
import type { WithdrawalDerivation, CrosschainWithdrawalDerivation } from '../crypto/withdrawalDerivation.js';
import { fromHashString } from '../types/Hash.js';
import { CommitmentNotFoundError, LabelNotApprovedError } from '../crypto/errors.js';

/**
 * Maximum tree depth for circuits
 */
const MAX_TREE_DEPTH = 32;

/**
 * Merkle trees for withdrawal proofs
 */
export interface WithdrawalTrees {
  /** State tree (all commitments) */
  stateTree: LeanIMT<bigint>;

  /** ASP tree (all approved labels) */
  aspTree: LeanIMT<bigint>;
}

/**
 * Withdrawal intent (from user)
 */
export interface WithdrawalIntent {
  /** Amount to withdraw */
  withdrawAmount: bigint;

  /** Total amount in note */
  noteAmount: bigint;

  /** Note label */
  label: bigint;
}

/**
 * Circuit witness object for same-chain withdrawal
 */
export interface WithdrawalCircuitWitness {
  withdrawnValue: string;
  stateRoot: string;
  ASPRoot: string;
  stateTreeDepth: string;
  ASPTreeDepth: string;
  context: string;
  label: string;
  existingValue: string;
  existingNullifier: string;
  existingSecret: string;
  newNullifier: string;
  newSecret: string;
  stateSiblings: string[];
  ASPSiblings: string[];
  stateIndex: number;
  ASPIndex: number;
}

/**
 * Circuit witness object for cross-chain withdrawal
 */
export interface CrosschainWithdrawalCircuitWitness extends WithdrawalCircuitWitness {
  refundNullifier: string;
  refundSecret: string;
}

/**
 * Pad array to specified length with zeros
 */
function padArray(arr: bigint[], length: number): bigint[] {
  if (arr.length >= length) return arr;
  return [...arr, ...Array(length - arr.length).fill(BigInt(0))];
}

/**
 * Build Merkle trees from state and ASP data
 *
 * @param stateCommitments - All commitments in the state tree
 * @param aspLabels - All approved labels in the ASP tree
 * @returns Merkle trees
 */
export function buildWithdrawalTrees(stateCommitments: bigint[], aspLabels: bigint[]): WithdrawalTrees {
  const hash = (a: bigint, b: bigint) => poseidon2([a, b]);

  // Build state tree
  const stateTree = new LeanIMT<bigint>(hash);
  for (const commitment of stateCommitments) {
    stateTree.insert(commitment);
  }

  // Build ASP tree
  const aspTree = new LeanIMT<bigint>(hash);
  for (const label of aspLabels) {
    aspTree.insert(label);
  }

  return { stateTree, aspTree };
}

/**
 * Build circuit witness for same-chain withdrawal
 *
 * Combines pure derivation + Merkle trees + intent → circuit witness.
 *
 * @param derivation - Pure withdrawal derivation
 * @param stateCommitments - All commitments in state tree (same order as tree)
 * @param aspLabels - All labels in ASP tree (same order as tree)
 * @param intent - Withdrawal intent
 * @returns Circuit witness ready for snarkjs
 *
 * @throws If commitment not found in state tree
 * @throws If label not found in ASP tree
 *
 * @example
 * ```typescript
 * const derivation = deriveWithdrawalInputs(...);
 * const intent = { withdrawAmount, noteAmount, label };
 *
 * const witness = buildWithdrawalCircuitWitness(
 *   derivation,
 *   stateCommitments,
 *   aspLabels,
 *   intent
 * );
 * ```
 */
export function buildWithdrawalCircuitWitness(
  derivation: WithdrawalDerivation,
  stateCommitments: bigint[],
  aspLabels: bigint[],
  intent: WithdrawalIntent,
): WithdrawalCircuitWitness {
  const { withdrawAmount, noteAmount, label } = intent;

  // Build trees
  const { stateTree, aspTree } = buildWithdrawalTrees(stateCommitments, aspLabels);

  // Find indices in commitment/label arrays
  const existingCommitmentBigInt = fromHashString(derivation.existingCommitment);

  const stateIndex = stateCommitments.indexOf(existingCommitmentBigInt);
  const aspIndex = aspLabels.indexOf(label);

  if (stateIndex === -1) {
    throw new CommitmentNotFoundError(derivation.existingCommitment);
  }

  if (aspIndex === -1) {
    throw new LabelNotApprovedError(label.toString());
  }

  // Generate Merkle proofs
  const stateProof = stateTree.generateProof(stateIndex);
  const aspProof = aspTree.generateProof(aspIndex);

  // Prepare circuit witness
  const witness = {
    withdrawnValue: withdrawAmount.toString(),
    stateRoot: stateProof.root.toString(),
    ASPRoot: aspProof.root.toString(),
    stateTreeDepth: stateTree.depth.toString(),
    ASPTreeDepth: aspTree.depth.toString(),
    context: fromHashString(derivation.contextHash).toString(),
    label: label.toString(),
    existingValue: noteAmount.toString(),
    existingNullifier: derivation.existingNullifier.toString(),
    existingSecret: derivation.existingSecret.toString(),
    newNullifier: derivation.newNullifier.toString(),
    newSecret: derivation.newSecret.toString(),
    stateSiblings: padArray(stateProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
    ASPSiblings: padArray(aspProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
    stateIndex: Object.is(stateProof.index, Number.NaN) ? 0 : stateProof.index,
    ASPIndex: Object.is(aspProof.index, Number.NaN) ? 0 : aspProof.index,
  };

  return witness;
}

/**
 * Build circuit witness for cross-chain withdrawal
 *
 * Combines pure derivation + Merkle trees + intent → circuit witness.
 * Includes refund credentials for failed cross-chain withdrawals.
 *
 * @param derivation - Pure cross-chain withdrawal derivation
 * @param stateCommitments - All commitments in state tree (same order as tree)
 * @param aspLabels - All labels in ASP tree (same order as tree)
 * @param intent - Withdrawal intent
 * @returns Circuit witness ready for snarkjs
 *
 * @throws If commitment not found in state tree
 * @throws If label not found in ASP tree
 *
 * @example
 * ```typescript
 * const derivation = deriveCrosschainWithdrawalInputs(...);
 * const intent = { withdrawAmount, noteAmount, label };
 *
 * const witness = buildCrosschainWithdrawalCircuitWitness(
 *   derivation,
 *   stateCommitments,
 *   aspLabels,
 *   intent
 * );
 * ```
 */
export function buildCrosschainWithdrawalCircuitWitness(
  derivation: CrosschainWithdrawalDerivation,
  stateCommitments: bigint[],
  aspLabels: bigint[],
  intent: WithdrawalIntent,
): CrosschainWithdrawalCircuitWitness {
  // Get base witness (same-chain logic)
  const baseWitness = buildWithdrawalCircuitWitness(derivation, stateCommitments, aspLabels, intent);

  return {
    ...baseWitness,
    refundNullifier: derivation.refundNullifier.toString(),
    refundSecret: derivation.refundSecret.toString(),
  };
}
