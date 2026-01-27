/**
 * Zero-Knowledge Proof Entry Point
 *
 * This module is a separate entry point to enable tree-shaking.
 * Import from '@shinobi-cash/core/zk' to include proof generation code.
 *
 * Keeping this separate from the main entry prevents snarkjs from being
 * bundled into pages that don't need proof generation.
 */

// ZK Proof Generation
export {
  WithdrawalProofGenerator,
  withdrawalProofGenerator,
  type CircuitFiles,
  type CircuitFileLoader,
  type WithdrawalProofData,
} from './zk/index.js';

// Withdrawal Circuit Witness (depends on @zk-kit/lean-imt)
export {
  buildWithdrawalTrees,
  buildWithdrawalCircuitWitness,
  buildCrosschainWithdrawalCircuitWitness,
  type WithdrawalTrees,
  type WithdrawalIntent,
  type WithdrawalCircuitWitness,
  type CrosschainWithdrawalCircuitWitness,
} from './services/WithdrawalCircuitWitness.js';
