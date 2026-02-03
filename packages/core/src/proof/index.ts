/**
 * @shinobi-cash/core/proof
 */

// @ts-ignore - snarkjs doesn't have type declarations
import * as snarkjs from 'snarkjs';
import { LeanIMT } from '@zk-kit/lean-imt';
import { poseidon2 } from 'poseidon-lite/poseidon2';
import type {
  WithdrawalDerivation,
  CrosschainWithdrawalDerivation,
  Withdraw2Derivation,
  CrosschainWithdraw2Derivation,
} from '../withdrawal/types.js';
import type {
  WithdrawalIntent,
  WithdrawalCircuitWitness,
  CrosschainWithdrawalCircuitWitness,
  WithdrawalProofData,
  CircuitFiles,
  CircuitFileLoader,
  ProofGenerator,
  Withdraw2Intent,
  Withdraw2CircuitWitness,
  CrosschainWithdraw2CircuitWitness,
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
  Withdraw2Intent,
  Withdraw2CircuitWitness,
  CrosschainWithdraw2CircuitWitness,
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

// ============ WITHDRAW2 (2:1) WITNESS BUILDING ============

/**
 * Build circuit witness for Withdraw2 (2:1 merge) withdrawal
 *
 * @param derivation - Cryptographic derivation data for both inputs
 * @param stateCommitments - All commitments in the state tree
 * @param aspLabels - All approved labels in the ASP tree
 * @param intent - Withdrawal intent with amounts and labels
 */
export function buildWithdraw2CircuitWitness(
  derivation: Withdraw2Derivation,
  stateCommitments: bigint[],
  aspLabels: bigint[],
  intent: Withdraw2Intent,
): Withdraw2CircuitWitness {
  const { withdrawAmount, primaryNoteAmount, primaryLabel, secondaryNoteAmount, secondaryLabel } =
    intent;

  const { stateTree, aspTree } = buildWithdrawalTrees(stateCommitments, aspLabels);

  // Find primary input in trees
  const primaryCommitmentBigInt = BigInt(derivation.primary.existingCommitment);
  const primaryStateIndex = stateCommitments.indexOf(primaryCommitmentBigInt);
  const primaryASPIndex = aspLabels.indexOf(primaryLabel);

  if (primaryStateIndex === -1) {
    throw new Error(
      `Primary commitment ${derivation.primary.existingCommitment} not found in state tree`,
    );
  }
  if (primaryASPIndex === -1) {
    throw new Error(`Primary label ${primaryLabel.toString()} not approved by ASP`);
  }

  // Find secondary input in trees
  const secondaryCommitmentBigInt = BigInt(derivation.secondary.existingCommitment);
  const secondaryStateIndex = stateCommitments.indexOf(secondaryCommitmentBigInt);
  const secondaryASPIndex = aspLabels.indexOf(secondaryLabel);

  if (secondaryStateIndex === -1) {
    throw new Error(
      `Secondary commitment ${derivation.secondary.existingCommitment} not found in state tree`,
    );
  }
  if (secondaryASPIndex === -1) {
    throw new Error(`Secondary label ${secondaryLabel.toString()} not approved by ASP`);
  }

  // Generate merkle proofs for both inputs
  const primaryStateProof = stateTree.generateProof(primaryStateIndex);
  const primaryASPProof = aspTree.generateProof(primaryASPIndex);
  const secondaryStateProof = stateTree.generateProof(secondaryStateIndex);
  const secondaryASPProof = aspTree.generateProof(secondaryASPIndex);

  return {
    // Public inputs
    withdrawnValue: withdrawAmount.toString(),
    stateRoot: primaryStateProof.root.toString(),
    stateTreeDepth: stateTree.depth.toString(),
    ASPRoot: primaryASPProof.root.toString(),
    ASPTreeDepth: aspTree.depth.toString(),
    context: derivation.contextHash,

    // Primary input (input0)
    existingValue0: primaryNoteAmount.toString(),
    label0: primaryLabel.toString(),
    existingNullifier0: derivation.primary.existingNullifier.toString(),
    existingSecret0: derivation.primary.existingSecret.toString(),
    stateSiblings0: padArray(primaryStateProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
    stateIndex0: Object.is(primaryStateProof.index, Number.NaN) ? 0 : primaryStateProof.index,
    ASPSiblings0: padArray(primaryASPProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
    ASPIndex0: Object.is(primaryASPProof.index, Number.NaN) ? 0 : primaryASPProof.index,

    // Secondary input (input1)
    existingValue1: secondaryNoteAmount.toString(),
    label1: secondaryLabel.toString(),
    existingNullifier1: derivation.secondary.existingNullifier.toString(),
    existingSecret1: derivation.secondary.existingSecret.toString(),
    stateSiblings1: padArray(secondaryStateProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
    stateIndex1: Object.is(secondaryStateProof.index, Number.NaN) ? 0 : secondaryStateProof.index,
    ASPSiblings1: padArray(secondaryASPProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
    ASPIndex1: Object.is(secondaryASPProof.index, Number.NaN) ? 0 : secondaryASPProof.index,

    // Output (change note)
    outputNullifier: derivation.primary.newNullifier.toString(),
    outputSecret: derivation.primary.newSecret.toString(),

    // Label selector
    labelSelector: derivation.labelSelector,
  };
}

/**
 * Build circuit witness for cross-chain Withdraw2 withdrawal
 * Includes refund commitment inputs for failure recovery
 */
export function buildCrosschainWithdraw2CircuitWitness(
  derivation: CrosschainWithdraw2Derivation,
  stateCommitments: bigint[],
  aspLabels: bigint[],
  intent: Withdraw2Intent,
): CrosschainWithdraw2CircuitWitness {
  const baseWitness = buildWithdraw2CircuitWitness(derivation, stateCommitments, aspLabels, intent);

  return {
    ...baseWitness,
    refundNullifier: derivation.refundNullifier.toString(),
    refundSecret: derivation.refundSecret.toString(),
  };
}

// ============ PROOF GENERATION ============

export interface ProofGeneratorConfig {
  /** Standard 1:1 withdrawal circuit */
  withdrawalLoader: CircuitFileLoader;
  /** Cross-chain 1:1 withdrawal circuit */
  crosschainWithdrawalLoader: CircuitFileLoader;
  /** Same-chain Withdraw2 (2:1) circuit */
  withdraw2Loader?: CircuitFileLoader;
  /** Cross-chain Withdraw2 circuit */
  crosschainWithdraw2Loader?: CircuitFileLoader;
}

/**
 * Create a proof generator with circuit file caching
 */
export function createProofGenerator(config: ProofGeneratorConfig): ProofGenerator {
  let withdrawalFiles: CircuitFiles | null = null;
  let crosschainFiles: CircuitFiles | null = null;
  let withdraw2Files: CircuitFiles | null = null;
  let crosschainWithdraw2Files: CircuitFiles | null = null;

  async function ensureWithdrawalFiles(): Promise<CircuitFiles> {
    if (!withdrawalFiles) {
      withdrawalFiles = await config.withdrawalLoader();
    }
    return withdrawalFiles;
  }

  async function ensureCrosschainFiles(): Promise<CircuitFiles> {
    if (!crosschainFiles) {
      crosschainFiles = await config.crosschainWithdrawalLoader();
    }
    return crosschainFiles;
  }

  async function ensureWithdraw2Files(): Promise<CircuitFiles> {
    if (!config.withdraw2Loader) {
      throw new Error('Withdraw2 circuit loader not configured');
    }
    if (!withdraw2Files) {
      withdraw2Files = await config.withdraw2Loader();
    }
    return withdraw2Files;
  }

  async function ensureCrosschainWithdraw2Files(): Promise<CircuitFiles> {
    if (!config.crosschainWithdraw2Loader) {
      throw new Error('Cross-chain Withdraw2 circuit loader not configured');
    }
    if (!crosschainWithdraw2Files) {
      crosschainWithdraw2Files = await config.crosschainWithdraw2Loader();
    }
    return crosschainWithdraw2Files;
  }

  return {
    async generateWithdrawalProof(witness: WithdrawalCircuitWitness): Promise<WithdrawalProofData> {
      const files = await ensureWithdrawalFiles();

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

    async generateCrosschainWithdrawalProof(
      witness: CrosschainWithdrawalCircuitWitness,
    ): Promise<WithdrawalProofData> {
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

    async generateWithdraw2Proof(witness: Withdraw2CircuitWitness): Promise<WithdrawalProofData> {
      const files = await ensureWithdraw2Files();

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

    async generateCrosschainWithdraw2Proof(
      witness: CrosschainWithdraw2CircuitWitness,
    ): Promise<WithdrawalProofData> {
      const files = await ensureCrosschainWithdraw2Files();

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
