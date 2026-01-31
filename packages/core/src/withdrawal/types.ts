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
