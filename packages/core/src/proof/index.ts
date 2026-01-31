/**
 * @shinobi-cash/core/proof
 */

// @ts-ignore - snarkjs doesn't have type declarations
import * as snarkjs from 'snarkjs';
import { LeanIMT } from '@zk-kit/lean-imt';
import { poseidon2 } from 'poseidon-lite/poseidon2';
import type { WithdrawalDerivation, CrosschainWithdrawalDerivation } from '../withdrawal/types.js';
import type {
  WithdrawalIntent,
  WithdrawalCircuitWitness,
  CrosschainWithdrawalCircuitWitness,
  WithdrawalProofData,
  CircuitFiles,
  CircuitFileLoader,
  ProofGenerator,
} from './types.js';

// Re-export types
export type {
  WithdrawalIntent,
  WithdrawalCircuitWitness,
  CrosschainWithdrawalCircuitWitness,
  WithdrawalProofData,
  CircuitFiles,
  CircuitFileLoader,
  ProofGenerator,
} from './types.js';

const MAX_TREE_DEPTH = 32;

// ============ WITNESS BUILDING ============

interface WithdrawalTrees {
  stateTree: LeanIMT<bigint>;
  aspTree: LeanIMT<bigint>;
}

function padArray(arr: bigint[], length: number): bigint[] {
  if (arr.length >= length) return arr;
  return [...arr, ...Array(length - arr.length).fill(BigInt(0))];
}

function buildWithdrawalTrees(stateCommitments: bigint[], aspLabels: bigint[]): WithdrawalTrees {
  const hash = (a: bigint, b: bigint) => poseidon2([a, b]);

  const stateTree = new LeanIMT<bigint>(hash);
  for (const commitment of stateCommitments) {
    stateTree.insert(commitment);
  }

  const aspTree = new LeanIMT<bigint>(hash);
  for (const label of aspLabels) {
    aspTree.insert(label);
  }

  return { stateTree, aspTree };
}

export function buildWithdrawalCircuitWitness(
  derivation: WithdrawalDerivation,
  stateCommitments: bigint[],
  aspLabels: bigint[],
  intent: WithdrawalIntent,
): WithdrawalCircuitWitness {
  const { withdrawAmount, noteAmount, label } = intent;

  const { stateTree, aspTree } = buildWithdrawalTrees(stateCommitments, aspLabels);

  const existingCommitmentBigInt = BigInt(derivation.existingCommitment);
  const stateIndex = stateCommitments.indexOf(existingCommitmentBigInt);
  const aspIndex = aspLabels.indexOf(label);

  if (stateIndex === -1) {
    throw new Error(`Commitment ${derivation.existingCommitment} not found in state tree`);
  }
  if (aspIndex === -1) {
    throw new Error(`Label ${label.toString()} not approved by ASP`);
  }

  const stateProof = stateTree.generateProof(stateIndex);
  const aspProof = aspTree.generateProof(aspIndex);

  return {
    withdrawnValue: withdrawAmount.toString(),
    stateRoot: stateProof.root.toString(),
    ASPRoot: aspProof.root.toString(),
    stateTreeDepth: stateTree.depth.toString(),
    ASPTreeDepth: aspTree.depth.toString(),
    context: derivation.contextHash,
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
}

export function buildCrosschainWithdrawalCircuitWitness(
  derivation: CrosschainWithdrawalDerivation,
  stateCommitments: bigint[],
  aspLabels: bigint[],
  intent: WithdrawalIntent,
): CrosschainWithdrawalCircuitWitness {
  const baseWitness = buildWithdrawalCircuitWitness(derivation, stateCommitments, aspLabels, intent);

  return {
    ...baseWitness,
    refundNullifier: derivation.refundNullifier.toString(),
    refundSecret: derivation.refundSecret.toString(),
  };
}

// ============ PROOF GENERATION ============

/**
 * Create a proof generator with circuit file caching
 */
export function createProofGenerator(
  circuitLoader: CircuitFileLoader,
  crosschainLoader: CircuitFileLoader,
): ProofGenerator {
  let circuitFiles: CircuitFiles | null = null;
  let crosschainFiles: CircuitFiles | null = null;

  async function ensureCircuitFiles(): Promise<CircuitFiles> {
    if (!circuitFiles) {
      circuitFiles = await circuitLoader();
    }
    return circuitFiles;
  }

  async function ensureCrosschainFiles(): Promise<CircuitFiles> {
    if (!crosschainFiles) {
      crosschainFiles = await crosschainLoader();
    }
    return crosschainFiles;
  }

  return {
    async generateWithdrawalProof(witness: WithdrawalCircuitWitness): Promise<WithdrawalProofData> {
      const files = await ensureCircuitFiles();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        witness,
        files.wasmFile,
        files.zkeyFile,
      );

      const isValid = await snarkjs.groth16.verify(files.vkeyData, publicSignals, proof);
      if (!isValid) {
        throw new Error('Generated proof failed verification');
      }

      return { proof, publicSignals };
    },

    async generateCrosschainWithdrawalProof(witness: CrosschainWithdrawalCircuitWitness): Promise<WithdrawalProofData> {
      const files = await ensureCrosschainFiles();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        witness,
        files.wasmFile,
        files.zkeyFile,
      );

      const isValid = await snarkjs.groth16.verify(files.vkeyData, publicSignals, proof);
      if (!isValid) {
        throw new Error('Generated proof failed verification');
      }

      return { proof, publicSignals };
    },
  };
}
