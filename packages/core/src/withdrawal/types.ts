/**
 * Withdrawal Types
 */

export interface WithdrawalData {
  processooor: `0x${string}`;
  data: `0x${string}`;
}

export interface CrossChainWithdrawalData {
  processooor: `0x${string}`;
  data: `0x${string}`;
}

/** Contract-ready Groth16 proof format */
export interface ContractProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

/** Cross-chain contract-ready proof (9 signals) */
export interface ContractCrossChainProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

export interface SnarkJsProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}

export type ContextHash = string;

export interface WithdrawalDerivation {
  contextHash: ContextHash;
  newNullifier: bigint;
  newSecret: bigint;
  existingNullifier: bigint;
  existingSecret: bigint;
  existingCommitment: string;
}

export interface CrosschainWithdrawalDerivation extends WithdrawalDerivation {
  refundNullifier: bigint;
  refundSecret: bigint;
  refundCommitment: string;
}

// ============ WITHDRAW2 (2:1) TYPES ============

/**
 * Same-chain Withdraw2 contract-ready proof (9 signals)
 *
 * Public signals order:
 * [0] newCommitmentHash - Change output commitment
 * [1] nullifierHash0 - Primary input nullifier (spent)
 * [2] nullifierHash1 - Secondary input nullifier (spent)
 * [3] withdrawnValue - Amount withdrawn
 * [4] stateRoot - State merkle root
 * [5] stateTreeDepth - State tree depth
 * [6] ASPRoot - ASP merkle root
 * [7] ASPTreeDepth - ASP tree depth
 * [8] context - Binding context hash
 */
export interface ContractWithdraw2SameChainProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

/**
 * Cross-chain Withdraw2 contract-ready proof (10 signals)
 *
 * Public signals order:
 * [0] newCommitmentHash - Change output commitment
 * [1] nullifierHash0 - Primary input nullifier (spent)
 * [2] nullifierHash1 - Secondary input nullifier (spent)
 * [3] refundCommitmentHash - Cross-chain refund commitment
 * [4] withdrawnValue - Amount withdrawn
 * [5] stateRoot - State merkle root
 * [6] stateTreeDepth - State tree depth
 * [7] ASPRoot - ASP merkle root
 * [8] ASPTreeDepth - ASP tree depth
 * [9] context - Binding context hash
 */
export interface ContractCrosschainWithdraw2Proof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

/**
 * @deprecated Use ContractWithdraw2SameChainProof or ContractCrosschainWithdraw2Proof
 */
export type ContractWithdraw2Proof = ContractCrosschainWithdraw2Proof;

/**
 * Withdraw2 derivation for primary input (continuing chain)
 */
export interface Withdraw2PrimaryDerivation {
  existingNullifier: bigint;
  existingSecret: bigint;
  existingCommitment: string;
  newNullifier: bigint;
  newSecret: bigint;
}

/**
 * Withdraw2 derivation for secondary input (merging chain)
 */
export interface Withdraw2SecondaryDerivation {
  existingNullifier: bigint;
  existingSecret: bigint;
  existingCommitment: string;
}

/**
 * Complete Withdraw2 derivation
 */
export interface Withdraw2Derivation {
  contextHash: ContextHash;
  primary: Withdraw2PrimaryDerivation;
  secondary: Withdraw2SecondaryDerivation;
  /** 0 = use primary's label, 1 = use secondary's label */
  labelSelector: 0 | 1;
}

/**
 * Cross-chain Withdraw2 derivation (includes refund commitment)
 */
export interface CrosschainWithdraw2Derivation extends Withdraw2Derivation {
  refundNullifier: bigint;
  refundSecret: bigint;
  refundCommitment: string;
}

// ============ RAGEQUIT TYPES ============

/**
 * Ragequit contract-ready proof (4 signals)
 *
 * Public signals order:
 * [0] commitmentHash - Hash of the commitment being ragequit
 * [1] nullifierHash - Nullifier hash of commitment being ragequit
 * [2] value - Value of the commitment being ragequit
 * [3] label - Label of commitment
 */
export interface ContractRagequitProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint, bigint];
}

/**
 * Ragequit derivation - simpler than withdrawal (no new commitment, no context)
 */
export interface RagequitDerivation {
  existingNullifier: bigint;
  existingSecret: bigint;
  existingCommitment: string;
  value: bigint;
  label: bigint;
}
