/**
 * @shinobi-cash/core/proof
 */

// @ts-ignore - snarkjs doesn't have type declarations
import * as snarkjs from "snarkjs";
import { LeanIMT } from "@zk-kit/lean-imt";
import { poseidon2 } from "poseidon-lite/poseidon2";
import type {
  WithdrawalDerivation,
  CrosschainWithdrawalDerivation,
  Withdraw2Derivation,
  CrosschainWithdraw2Derivation,
} from "../withdrawal/types.js";
import type {
  WithdrawalIntent,
  CrosschainWithdrawalIntent,
  WithdrawalCircuitWitness,
  CrosschainWithdrawalCircuitWitness,
  WithdrawalProofData,
  CircuitFiles,
  CircuitFileLoader,
  CircuitFetcher,
  ProofGenerator,
  Withdraw2Intent,
  CrosschainWithdraw2Intent,
  Withdraw2CircuitWitness,
  CrosschainWithdraw2CircuitWitness,
  RagequitCircuitWitness,
  RagequitProofData,
  PrecomputedASPProof,
} from "./types.js";

// Re-export types
export type {
  WithdrawalIntent,
  CrosschainWithdrawalIntent,
  WithdrawalCircuitWitness,
  CrosschainWithdrawalCircuitWitness,
  WithdrawalProofData,
  CircuitFiles,
  CircuitFileLoader,
  CircuitFetcher,
  ProofGenerator,
  Withdraw2Intent,
  CrosschainWithdraw2Intent,
  Withdraw2CircuitWitness,
  CrosschainWithdraw2CircuitWitness,
  RagequitCircuitWitness,
  RagequitProofData,
  PrecomputedASPProof,
} from "./types.js";

const MAX_TREE_DEPTH = 32;

// ============ WITNESS BUILDING ============

function padArray(arr: bigint[], length: number): bigint[] {
  if (arr.length >= length) return arr;
  return [...arr, ...Array(length - arr.length).fill(BigInt(0))];
}

/** Recompute LeanIMT root from a Merkle inclusion proof (mirrors the circuit logic) */
function computeLeanIMTRoot(leaf: bigint, siblings: bigint[], leafIndex: number): bigint {
  let current = leaf;
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === 0n) continue; // empty sibling → propagate
    const bit = (leafIndex >> i) & 1;
    current = bit === 0
      ? poseidon2([current, sibling])
      : poseidon2([sibling, current]);
  }
  return current;
}

/**
 * Build withdrawal circuit witness using precomputed ASP proof from IPFS
 * Skips ASP tree building - uses proof directly from v2.1 format
 *
 * @param derivation - Cryptographic derivation data
 * @param stateCommitments - All commitments in the state tree
 * @param aspProof - Precomputed ASP proof from IPFS
 * @param intent - Withdrawal intent with amounts
 */
export function buildWithdrawalCircuitWitnessWithProof(
  derivation: WithdrawalDerivation,
  stateCommitments: bigint[],
  aspProof: PrecomputedASPProof,
  intent: WithdrawalIntent
): WithdrawalCircuitWitness {
  const { withdrawAmount, noteAmount } = intent;

  // Build only state tree (ASP proof is precomputed)
  const hash = (a: bigint, b: bigint) => poseidon2([a, b]);
  const stateTree = new LeanIMT<bigint>(hash);
  for (const commitment of stateCommitments) {
    stateTree.insert(commitment);
  }

  const existingCommitmentBigInt = BigInt(derivation.existingCommitment);
  const stateIndex = stateCommitments.indexOf(existingCommitmentBigInt);

  if (stateIndex === -1) {
    throw new Error(`Commitment ${derivation.existingCommitment} not found in state tree`);
  }

  const stateProof = stateTree.generateProof(stateIndex);

  // Pre-verify ASP Merkle proof (mirrors circom line 82: ASPRoot === ASPRootChecker.out)
  const aspSiblingsBigInt = aspProof.siblings.map(BigInt);
  const computedASPRoot = computeLeanIMTRoot(intent.label, aspSiblingsBigInt, aspProof.index);
  const claimedASPRoot = BigInt(aspProof.aspRoot);
  if (computedASPRoot !== claimedASPRoot) {
    throw new Error(
      `ASP Merkle proof invalid: computed root ${computedASPRoot} does not match claimed root ${claimedASPRoot}. ` +
      `Label: ${intent.label}, index: ${aspProof.index}, depth: ${aspProof.treeDepth}`
    );
  }

  // Pre-verify state Merkle proof
  const computedStateRoot = computeLeanIMTRoot(
    existingCommitmentBigInt,
    stateProof.siblings,
    stateProof.index,
  );
  if (computedStateRoot !== stateProof.root) {
    throw new Error(
      `State Merkle proof invalid: computed root ${computedStateRoot} does not match claimed root ${stateProof.root}`
    );
  }

  return {
    withdrawnValue: withdrawAmount.toString(),
    stateRoot: stateProof.root.toString(),
    ASPRoot: aspProof.aspRoot,
    stateTreeDepth: stateTree.depth.toString(),
    ASPTreeDepth: aspProof.treeDepth.toString(),
    context: derivation.contextHash,
    label: intent.label.toString(),
    existingValue: noteAmount.toString(),
    existingNullifier: derivation.existingNullifier.toString(),
    existingSecret: derivation.existingSecret.toString(),
    newNullifier: derivation.newNullifier.toString(),
    newSecret: derivation.newSecret.toString(),
    stateSiblings: padArray(stateProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
    ASPSiblings: padArray(aspProof.siblings.map(BigInt), MAX_TREE_DEPTH).map((s) => s.toString()),
    stateIndex: Object.is(stateProof.index, Number.NaN) ? 0 : stateProof.index,
    ASPIndex: aspProof.index,
  };
}

/**
 * Build cross-chain withdrawal circuit witness using precomputed ASP proof
 */
export function buildCrosschainWithdrawalCircuitWitnessWithProof(
  derivation: CrosschainWithdrawalDerivation,
  stateCommitments: bigint[],
  aspProof: PrecomputedASPProof,
  intent: CrosschainWithdrawalIntent
): CrosschainWithdrawalCircuitWitness {
  const baseWitness = buildWithdrawalCircuitWitnessWithProof(
    derivation,
    stateCommitments,
    aspProof,
    intent
  );

  return {
    ...baseWitness,
    refundNullifier: derivation.refundNullifier.toString(),
    refundSecret: derivation.refundSecret.toString(),
    relayFeeBPS: intent.relayFeeBPS.toString(),
    refundFeeBPS: intent.refundFeeBPS.toString(),
  };
}

// ============ WITHDRAW2 WITH PRECOMPUTED ASP PROOFS ============

/**
 * Build Withdraw2 circuit witness using precomputed ASP proofs from IPFS
 * Requires two ASP proofs - one for each label being spent
 *
 * @param derivation - Cryptographic derivation data for both inputs
 * @param stateCommitments - All commitments in the state tree
 * @param primaryASPProof - Precomputed ASP proof for primary label
 * @param secondaryASPProof - Precomputed ASP proof for secondary label
 * @param intent - Withdrawal intent with amounts and labels
 */
export function buildWithdraw2CircuitWitnessWithProof(
  derivation: Withdraw2Derivation,
  stateCommitments: bigint[],
  primaryASPProof: PrecomputedASPProof,
  secondaryASPProof: PrecomputedASPProof,
  intent: Withdraw2Intent
): Withdraw2CircuitWitness {
  const { withdrawAmount, primaryNoteAmount, primaryLabel, secondaryNoteAmount, secondaryLabel } =
    intent;

  // Build only state tree
  const hash = (a: bigint, b: bigint) => poseidon2([a, b]);
  const stateTree = new LeanIMT<bigint>(hash);
  for (const commitment of stateCommitments) {
    stateTree.insert(commitment);
  }

  // Find both commitments in state tree
  const primaryCommitmentBigInt = BigInt(derivation.primary.existingCommitment);
  const primaryStateIndex = stateCommitments.indexOf(primaryCommitmentBigInt);

  if (primaryStateIndex === -1) {
    throw new Error(
      `Primary commitment ${derivation.primary.existingCommitment} not found in state tree`
    );
  }

  const secondaryCommitmentBigInt = BigInt(derivation.secondary.existingCommitment);
  const secondaryStateIndex = stateCommitments.indexOf(secondaryCommitmentBigInt);

  if (secondaryStateIndex === -1) {
    throw new Error(
      `Secondary commitment ${derivation.secondary.existingCommitment} not found in state tree`
    );
  }

  // Generate state tree proofs
  const primaryStateProof = stateTree.generateProof(primaryStateIndex);
  const secondaryStateProof = stateTree.generateProof(secondaryStateIndex);

  // Verify ASP roots match (both proofs should be against same ASP root)
  if (primaryASPProof.aspRoot !== secondaryASPProof.aspRoot) {
    throw new Error("ASP root mismatch between primary and secondary proofs");
  }

  return {
    // Public inputs
    withdrawnValue: withdrawAmount.toString(),
    stateRoot: primaryStateProof.root.toString(),
    stateTreeDepth: stateTree.depth.toString(),
    ASPRoot: primaryASPProof.aspRoot,
    ASPTreeDepth: primaryASPProof.treeDepth.toString(),
    context: derivation.contextHash,

    // Primary input (input0)
    existingValue0: primaryNoteAmount.toString(),
    label0: primaryLabel.toString(),
    existingNullifier0: derivation.primary.existingNullifier.toString(),
    existingSecret0: derivation.primary.existingSecret.toString(),
    stateSiblings0: padArray(primaryStateProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
    stateIndex0: Object.is(primaryStateProof.index, Number.NaN) ? 0 : primaryStateProof.index,
    ASPSiblings0: padArray(primaryASPProof.siblings.map(BigInt), MAX_TREE_DEPTH).map((s) =>
      s.toString()
    ),
    ASPIndex0: primaryASPProof.index,

    // Secondary input (input1)
    existingValue1: secondaryNoteAmount.toString(),
    label1: secondaryLabel.toString(),
    existingNullifier1: derivation.secondary.existingNullifier.toString(),
    existingSecret1: derivation.secondary.existingSecret.toString(),
    stateSiblings1: padArray(secondaryStateProof.siblings, MAX_TREE_DEPTH).map((s) => s.toString()),
    stateIndex1: Object.is(secondaryStateProof.index, Number.NaN) ? 0 : secondaryStateProof.index,
    ASPSiblings1: padArray(secondaryASPProof.siblings.map(BigInt), MAX_TREE_DEPTH).map((s) =>
      s.toString()
    ),
    ASPIndex1: secondaryASPProof.index,

    // Output (change note)
    outputNullifier: derivation.primary.newNullifier.toString(),
    outputSecret: derivation.primary.newSecret.toString(),

    // Label selector
    labelSelector: derivation.labelSelector,
  };
}

/**
 * Build cross-chain Withdraw2 circuit witness using precomputed ASP proofs
 */
export function buildCrosschainWithdraw2CircuitWitnessWithProof(
  derivation: CrosschainWithdraw2Derivation,
  stateCommitments: bigint[],
  primaryASPProof: PrecomputedASPProof,
  secondaryASPProof: PrecomputedASPProof,
  intent: CrosschainWithdraw2Intent
): CrosschainWithdraw2CircuitWitness {
  const baseWitness = buildWithdraw2CircuitWitnessWithProof(
    derivation,
    stateCommitments,
    primaryASPProof,
    secondaryASPProof,
    intent
  );

  return {
    ...baseWitness,
    refundNullifier: derivation.refundNullifier.toString(),
    refundSecret: derivation.refundSecret.toString(),
    relayFeeBPS: intent.relayFeeBPS.toString(),
    refundFeeBPS: intent.refundFeeBPS.toString(),
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
  /** Ragequit (commitment) circuit */
  ragequitLoader?: CircuitFileLoader;
}

/**
 * Create a proof generator with circuit file caching
 */
export function createProofGenerator(config: ProofGeneratorConfig): ProofGenerator {
  let withdrawalFiles: CircuitFiles | null = null;
  let crosschainFiles: CircuitFiles | null = null;
  let withdraw2Files: CircuitFiles | null = null;
  let crosschainWithdraw2Files: CircuitFiles | null = null;
  let ragequitFiles: CircuitFiles | null = null;

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
      throw new Error("Withdraw2 circuit loader not configured");
    }
    if (!withdraw2Files) {
      withdraw2Files = await config.withdraw2Loader();
    }
    return withdraw2Files;
  }

  async function ensureCrosschainWithdraw2Files(): Promise<CircuitFiles> {
    if (!config.crosschainWithdraw2Loader) {
      throw new Error("Cross-chain Withdraw2 circuit loader not configured");
    }
    if (!crosschainWithdraw2Files) {
      crosschainWithdraw2Files = await config.crosschainWithdraw2Loader();
    }
    return crosschainWithdraw2Files;
  }

  async function ensureRagequitFiles(): Promise<CircuitFiles> {
    if (!config.ragequitLoader) {
      throw new Error("Ragequit circuit loader not configured");
    }
    if (!ragequitFiles) {
      ragequitFiles = await config.ragequitLoader();
    }
    return ragequitFiles;
  }

  return {
    async generateWithdrawalProof(witness: WithdrawalCircuitWitness): Promise<WithdrawalProofData> {
      const files = await ensureWithdrawalFiles();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        witness,
        files.wasmFile,
        files.zkeyFile
      );

      const isValid = await snarkjs.groth16.verify(files.vkeyData, publicSignals, proof);
      if (!isValid) {
        throw new Error("Generated proof failed verification");
      }

      return { proof, publicSignals };
    },

    async generateCrosschainWithdrawalProof(
      witness: CrosschainWithdrawalCircuitWitness
    ): Promise<WithdrawalProofData> {
      const files = await ensureCrosschainFiles();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        witness,
        files.wasmFile,
        files.zkeyFile
      );

      const isValid = await snarkjs.groth16.verify(files.vkeyData, publicSignals, proof);
      if (!isValid) {
        throw new Error("Generated proof failed verification");
      }

      return { proof, publicSignals };
    },

    async generateWithdraw2Proof(witness: Withdraw2CircuitWitness): Promise<WithdrawalProofData> {
      const files = await ensureWithdraw2Files();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        witness,
        files.wasmFile,
        files.zkeyFile
      );

      const isValid = await snarkjs.groth16.verify(files.vkeyData, publicSignals, proof);
      if (!isValid) {
        throw new Error("Generated proof failed verification");
      }

      return { proof, publicSignals };
    },

    async generateCrosschainWithdraw2Proof(
      witness: CrosschainWithdraw2CircuitWitness
    ): Promise<WithdrawalProofData> {
      const files = await ensureCrosschainWithdraw2Files();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        witness,
        files.wasmFile,
        files.zkeyFile
      );

      const isValid = await snarkjs.groth16.verify(files.vkeyData, publicSignals, proof);
      if (!isValid) {
        throw new Error("Generated proof failed verification");
      }

      return { proof, publicSignals };
    },

    async generateRagequitProof(witness: RagequitCircuitWitness): Promise<RagequitProofData> {
      const files = await ensureRagequitFiles();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        witness,
        files.wasmFile,
        files.zkeyFile
      );

      const isValid = await snarkjs.groth16.verify(files.vkeyData, publicSignals, proof);
      if (!isValid) {
        throw new Error("Generated ragequit proof failed verification");
      }

      return { proof, publicSignals };
    },
  };
}

// ============ DEFAULT CIRCUIT FETCHER ============

const CIRCUIT_PATHS = {
  withdrawal: { wasm: "build/withdraw/withdraw.wasm", zkey: "keys/withdraw.zkey", vkey: "keys/withdraw.vkey" },
  crosschainWithdrawal: { wasm: "build/crosschain_withdraw/crosschain_withdrawal.wasm", zkey: "keys/crosschain_withdrawal.zkey", vkey: "keys/crosschain_withdrawal.vkey" },
  withdraw2: { wasm: "build/withdraw2/withdraw2.wasm", zkey: "keys/withdraw2.zkey", vkey: "keys/withdraw2.vkey" },
  crosschainWithdraw2: { wasm: "build/crosschain_withdraw2/crosschain_withdraw2.wasm", zkey: "keys/crosschain_withdraw2.zkey", vkey: "keys/crosschain_withdraw2.vkey" },
  ragequit: { wasm: "build/commitment/commitment.wasm", zkey: "keys/commitment.zkey", vkey: "keys/commitment.vkey" },
} as const;

/** Create an HTTP circuit fetcher from a base URL (like Kohaku's rgHttpFetcher) */
export const httpCircuitFetcher = (baseUrl: string): CircuitFetcher => async (path: string) => {
  const response = await fetch(baseUrl + path);
  if (!response.ok) throw new Error(`Failed to fetch circuit file: ${baseUrl + path}`);
  return new Uint8Array(await response.arrayBuffer());
};

async function loadCircuit(fetcher: CircuitFetcher, paths: { wasm: string; zkey: string; vkey: string }): Promise<CircuitFiles> {
  const [wasmFile, zkeyFile, vkeyRaw] = await Promise.all([
    fetcher(paths.wasm),
    fetcher(paths.zkey),
    fetcher(paths.vkey),
  ]);
  return { wasmFile, zkeyFile, vkeyData: JSON.parse(new TextDecoder().decode(vkeyRaw)) };
}

/** Create a proof generator using a circuit fetcher (defaults to HTTP from /circuits/) */
export function createDefaultProofGenerator(fetcher: CircuitFetcher): ProofGenerator {
  return createProofGenerator({
    withdrawalLoader: () => loadCircuit(fetcher, CIRCUIT_PATHS.withdrawal),
    crosschainWithdrawalLoader: () => loadCircuit(fetcher, CIRCUIT_PATHS.crosschainWithdrawal),
    withdraw2Loader: () => loadCircuit(fetcher, CIRCUIT_PATHS.withdraw2),
    crosschainWithdraw2Loader: () => loadCircuit(fetcher, CIRCUIT_PATHS.crosschainWithdraw2),
    ragequitLoader: () => loadCircuit(fetcher, CIRCUIT_PATHS.ragequit),
  });
}
