/**
 * Withdrawal Proof Generator
 *
 * Stateful class for generating zero-knowledge proofs for withdrawals.
 * Handles circuit loading, caching, and snarkjs invocation.
 *
 * Responsibilities:
 * - Circuit loading (WASM, zkey, vkey)
 * - Circuit caching (expensive)
 * - snarkjs invocation
 * - Proof verification
 *
 * Does NOT handle:
 * - Nullifier/secret derivation (see crypto/withdrawalDerivation.ts)
 * - Merkle tree building (see services/WithdrawalCircuitWitness.ts)
 * - Circuit witness preparation (see services/WithdrawalCircuitWitness.ts)
 */

// @ts-ignore - snarkjs doesn't have type declarations
import * as snarkjs from 'snarkjs';
import type { WithdrawalCircuitWitness, CrosschainWithdrawalCircuitWitness } from '../services/WithdrawalCircuitWitness.js';

/**
 * Withdrawal proof data in Groth16 format
 */
export interface WithdrawalProofData {
  /** Groth16 proof */
  proof: snarkjs.Groth16Proof;

  /** Public signals for verification */
  publicSignals: string[];
}

/**
 * Circuit files needed for proof generation
 */
export interface CircuitFiles {
  /** WASM circuit file */
  wasmFile: Uint8Array;

  /** Proving key file */
  zkeyFile: Uint8Array;

  /** Verification key data */
  vkeyData: object;
}

/**
 * Circuit file loader function type
 */
export type CircuitFileLoader = () => Promise<CircuitFiles>;

/**
 * Withdrawal Proof Generator
 *
 * Handles ZK proof generation for privacy pool withdrawals.
 * Supports both same-chain and cross-chain withdrawal proofs.
 *
 * @example
 * ```typescript
 * // Create generator with custom circuit loader
 * const generator = new WithdrawalProofGenerator(
 *   async () => ({
 *     wasmFile: await loadWasm(),
 *     zkeyFile: await loadZkey(),
 *     vkeyData: await loadVkey()
 *   }),
 *   async () => ({
 *     wasmFile: await loadCrosschainWasm(),
 *     zkeyFile: await loadCrosschainZkey(),
 *     vkeyData: await loadCrosschainVkey()
 *   })
 * );
 *
 * // Build circuit witness using adapter
 * const derivation = deriveWithdrawalInputs(...);
 * const trees = buildWithdrawalTrees(...);
 * const witness = buildWithdrawalCircuitWitness(derivation, trees, intent);
 *
 * // Generate proof
 * const proof = await generator.generateWithdrawalProof(witness);
 * ```
 */
export class WithdrawalProofGenerator {
  private circuitFiles: CircuitFiles | null = null;
  private crosschainCircuitFiles: CircuitFiles | null = null;
  private circuitFileLoader?: CircuitFileLoader;
  private crosschainCircuitFileLoader?: CircuitFileLoader;

  /**
   * Create a new proof generator
   *
   * @param circuitFileLoader - Function to load same-chain circuit files
   * @param crosschainCircuitFileLoader - Function to load cross-chain circuit files (optional)
   */
  constructor(circuitFileLoader?: CircuitFileLoader, crosschainCircuitFileLoader?: CircuitFileLoader) {
    this.circuitFileLoader = circuitFileLoader;
    this.crosschainCircuitFileLoader = crosschainCircuitFileLoader;
  }

  /**
   * Ensure same-chain circuit files are loaded
   */
  private async ensureCircuitFiles(): Promise<CircuitFiles> {
    if (!this.circuitFiles) {
      if (!this.circuitFileLoader) {
        throw new Error('Circuit file loader not provided. Please provide a circuit file loader in constructor.');
      }
      this.circuitFiles = await this.circuitFileLoader();
    }
    return this.circuitFiles;
  }

  /**
   * Ensure cross-chain circuit files are loaded
   */
  private async ensureCrossChainWithdrawalCircuitFiles(): Promise<CircuitFiles> {
    if (!this.crosschainCircuitFiles) {
      if (!this.crosschainCircuitFileLoader) {
        throw new Error(
          'Cross-chain circuit file loader not provided. Please provide a cross-chain circuit file loader in constructor.',
        );
      }
      this.crosschainCircuitFiles = await this.crosschainCircuitFileLoader();
    }
    return this.crosschainCircuitFiles;
  }

  /**
   * Generate a same-chain withdrawal proof
   *
   * @param witness - Prepared circuit witness
   * @returns Proof data with proof and public signals
   *
   * @throws If circuit files not provided
   * @throws If proof generation fails
   * @throws If proof verification fails
   */
  async generateWithdrawalProof(witness: WithdrawalCircuitWitness): Promise<WithdrawalProofData> {
    // Ensure circuit files are loaded
    const circuitFiles = await this.ensureCircuitFiles();

    // Generate proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      witness,
      circuitFiles.wasmFile,
      circuitFiles.zkeyFile,
    );

    // Verify proof
    const isValid = await this.verifyWithdrawalProof({ proof, publicSignals });

    if (!isValid) {
      throw new Error('Generated proof failed verification');
    }

    return { proof, publicSignals };
  }

  /**
   * Generate a cross-chain withdrawal proof
   *
   * @param witness - Prepared circuit witness (includes refund credentials)
   * @returns Proof data with proof and public signals
   *
   * @throws If circuit files not provided
   * @throws If proof generation fails
   * @throws If proof verification fails
   */
  async generateCrosschainWithdrawalProof(
    witness: CrosschainWithdrawalCircuitWitness,
  ): Promise<WithdrawalProofData> {
    // Ensure circuit files are loaded
    const circuitFiles = await this.ensureCrossChainWithdrawalCircuitFiles();

    // Generate proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      witness,
      circuitFiles.wasmFile,
      circuitFiles.zkeyFile,
    );

    // Verify proof with cross-chain verification key
    const isValid = await this.verifyCrosschainWithdrawalProof({ proof, publicSignals });

    if (!isValid) {
      throw new Error('Generated proof failed verification');
    }

    return { proof, publicSignals };
  }

  /**
   * Verify a same-chain withdrawal proof
   *
   * @param proofData - Proof data to verify
   * @returns true if proof is valid, false if invalid
   * @throws If circuit files fail to load or snarkjs verification throws
   */
  async verifyWithdrawalProof(proofData: WithdrawalProofData): Promise<boolean> {
    const circuitFiles = await this.ensureCircuitFiles();
    return snarkjs.groth16.verify(circuitFiles.vkeyData, proofData.publicSignals, proofData.proof);
  }

  /**
   * Verify a cross-chain withdrawal proof
   *
   * @param proofData - Proof data to verify
   * @returns true if proof is valid, false if invalid
   * @throws If circuit files fail to load or snarkjs verification throws
   */
  async verifyCrosschainWithdrawalProof(proofData: WithdrawalProofData): Promise<boolean> {
    const circuitFiles = await this.ensureCrossChainWithdrawalCircuitFiles();
    return snarkjs.groth16.verify(circuitFiles.vkeyData, proofData.publicSignals, proofData.proof);
  }
}

/**
 * Singleton instance for reuse across the application
 * Avoids duplicate circuit loading and improves performance
 */
export const withdrawalProofGenerator = new WithdrawalProofGenerator();
