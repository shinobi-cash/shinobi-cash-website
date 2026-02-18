/**
 * Proof Types
 */

// @ts-ignore - snarkjs doesn't have type declarations
import type * as snarkjs from "snarkjs";

export interface WithdrawalIntent {
  withdrawAmount: bigint;
  noteAmount: bigint;
  label: bigint;
}

export interface CrosschainWithdrawalIntent extends WithdrawalIntent {
  relayFeeBPS: bigint;
  refundFeeBPS: bigint;
}

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

export interface CrosschainWithdrawalCircuitWitness extends WithdrawalCircuitWitness {
  refundNullifier: string;
  refundSecret: string;
  relayFeeBPS: string;
  refundFeeBPS: string;
}

export interface WithdrawalProofData {
  proof: snarkjs.Groth16Proof;
  publicSignals: string[];
}

export interface CircuitFiles {
  wasmFile: Uint8Array;
  zkeyFile: Uint8Array;
  vkeyData: object;
}

export type CircuitFileLoader = () => Promise<CircuitFiles>;

export interface ProofGenerator {
  generateWithdrawalProof(witness: WithdrawalCircuitWitness): Promise<WithdrawalProofData>;
  generateCrosschainWithdrawalProof(
    witness: CrosschainWithdrawalCircuitWitness
  ): Promise<WithdrawalProofData>;
  generateWithdraw2Proof(witness: Withdraw2CircuitWitness): Promise<WithdrawalProofData>;
  generateCrosschainWithdraw2Proof(
    witness: CrosschainWithdraw2CircuitWitness
  ): Promise<WithdrawalProofData>;
  generateRagequitProof?(witness: RagequitCircuitWitness): Promise<RagequitProofData>;
}

// ============ PRECOMPUTED ASP PROOF ============

/**
 * Precomputed ASP merkle proof from IPFS (v2.1 format)
 * Used to skip client-side ASP tree building
 */
export interface PrecomputedASPProof {
  aspRoot: string;
  treeDepth: number;
  siblings: string[];
  index: number;
}

// ============ RAGEQUIT TYPES ============

/**
 * Ragequit circuit witness (4 public signals)
 *
 * Public signals order (from commitment circuit):
 * [0] commitmentHash - hash of the commitment
 * [1] nullifierHash - hash of the nullifier
 * [2] value - amount in the commitment
 * [3] label - deposit label
 *
 * Private inputs:
 * - nullifier - the secret nullifier
 * - secret - the secret value
 */
export interface RagequitCircuitWitness {
  value: string;
  label: string;
  nullifier: string;
  secret: string;
}

/**
 * Ragequit proof data with 4 public signals
 */
export interface RagequitProofData {
  proof: snarkjs.Groth16Proof;
  publicSignals: string[];
}

// ============ WITHDRAW2 (2:1) TYPES ============

/**
 * Intent for Withdraw2 (2:1 merge) withdrawal
 */
export interface Withdraw2Intent {
  withdrawAmount: bigint;
  primaryNoteAmount: bigint;
  primaryLabel: bigint;
  secondaryNoteAmount: bigint;
  secondaryLabel: bigint;
}

export interface CrosschainWithdraw2Intent extends Withdraw2Intent {
  relayFeeBPS: bigint;
  refundFeeBPS: bigint;
}

/**
 * Withdraw2 circuit witness (10 public signals, multiple private inputs)
 *
 * Public signals order:
 * [0] newCommitmentHash - computed by circuit
 * [1] nullifierHash0 - primary nullifier hash, computed by circuit
 * [2] nullifierHash1 - secondary nullifier hash, computed by circuit
 * [3] refundCommitmentHash - computed by circuit (0 for same-chain)
 * [4] withdrawnValue - amount withdrawn
 * [5] stateRoot - state merkle root
 * [6] stateTreeDepth - state tree depth
 * [7] ASPRoot - ASP merkle root
 * [8] ASPTreeDepth - ASP tree depth
 * [9] context - binding context hash
 */
export interface Withdraw2CircuitWitness {
  // Public inputs
  withdrawnValue: string;
  stateRoot: string;
  stateTreeDepth: string;
  ASPRoot: string;
  ASPTreeDepth: string;
  context: string;

  // Primary input (input0)
  existingValue0: string;
  label0: string;
  existingNullifier0: string;
  existingSecret0: string;
  stateSiblings0: string[];
  stateIndex0: number;
  ASPSiblings0: string[];
  ASPIndex0: number;

  // Secondary input (input1)
  existingValue1: string;
  label1: string;
  existingNullifier1: string;
  existingSecret1: string;
  stateSiblings1: string[];
  stateIndex1: number;
  ASPSiblings1: string[];
  ASPIndex1: number;

  // Output (change note)
  outputNullifier: string;
  outputSecret: string;

  // Label selection: 0 = use label0, 1 = use label1
  labelSelector: number;
}

/**
 * Cross-chain Withdraw2 witness (includes refund commitment inputs and fees)
 */
export interface CrosschainWithdraw2CircuitWitness extends Withdraw2CircuitWitness {
  refundNullifier: string;
  refundSecret: string;
  relayFeeBPS: string;
  refundFeeBPS: string;
}
