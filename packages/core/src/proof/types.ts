/**
 * Proof Types
 */

// @ts-ignore - snarkjs doesn't have type declarations
import type * as snarkjs from 'snarkjs';

export interface WithdrawalIntent {
  withdrawAmount: bigint;
  noteAmount: bigint;
  label: bigint;
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
  generateCrosschainWithdrawalProof(witness: CrosschainWithdrawalCircuitWitness): Promise<WithdrawalProofData>;
}
