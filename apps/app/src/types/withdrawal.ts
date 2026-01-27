import type { Note, WithdrawalDerivation, CrosschainWithdrawalDerivation } from "@shinobi-cash/core";
import type { SmartAccountClient } from "permissionless";
import type { UserOperation } from "viem/account-abstraction";

// Re-export SDK types for convenience
export type { WithdrawalKind, FeeQuote } from "@shinobi-cash/core";
import type { WithdrawalKind, FeeQuote } from "@shinobi-cash/core";

export interface WithdrawalRequest {
  note: Note;
  withdrawAmountWei: bigint;
  recipient: `0x${string}`;
  accountKey: bigint;
  destinationChainId?: number;
}

export interface WithdrawalPipelineContext {
  kind: WithdrawalKind;
  request: WithdrawalRequest;
  feeQuote: FeeQuote;
  poolScope: bigint;
  derivation: WithdrawalDerivation | CrosschainWithdrawalDerivation;
  withdrawalData: readonly [`0x${string}`, `0x${string}`];
}

export interface WithdrawalWitness {
  context: WithdrawalPipelineContext;
  stateTreeLeaves: bigint[];
  aspTreeLeaves: bigint[];
  circuitInputs: {
    withdrawAmount: bigint;
    noteAmount: bigint;
    label: bigint;
  };
}

export interface WithdrawalProof {
  witness: WithdrawalWitness;
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
}

export interface PreparedUserOperation {
  context: WithdrawalPipelineContext;
  proof: WithdrawalProof;
  userOperation: UserOperation<"0.7">;
  smartAccountClient: SmartAccountClient;
}

export interface ExecutionResult {
  transactionHash: string;
  success: boolean;
}

export interface ExternalData {
  stateTreeLeaves: { leafValue: string }[];
  aspData: {
    root: string;
    ipfsCID: string;
    timestamp: string;
    approvalList: string[];
  };
}
