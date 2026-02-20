import type {
  WithdrawalDerivation,
  CrosschainWithdrawalDerivation,
  Withdraw2Derivation,
  CrosschainWithdraw2Derivation,
} from "@shinobi-cash/core/withdrawal";
import type { Note } from "@shinobi-cash/core/discovery";
import type { SmartAccountClient } from "permissionless";
import type { UserOperation } from "viem/account-abstraction";
import type { GasLimits } from "@/lib/clients";

/**
 * Type of withdrawal operation
 */
export type WithdrawalKind = "same-chain" | "cross-chain";

/**
 * Fee quote for a withdrawal operation
 */
export interface FeeQuote {
  /** Type of withdrawal */
  kind: WithdrawalKind;

  /** Relay fee in basis points */
  relayFeeBPS: number;

  /** Solver fee in basis points (cross-chain only) */
  solverFeeBPS: number;

  /** Execution/relay fee in wei */
  executionFeeWei: bigint;

  /** Solver fee in wei */
  solverFeeWei: bigint;

  /** Total fees in wei */
  totalFeeWei: bigint;

  /** Net amount after fees in wei */
  netAmountWei: bigint;

  /** Gas price used for fee calculation */
  gasPrice: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
}

/**
 * Request for a withdrawal operation
 */
export interface WithdrawalRequest {
  /** Note to withdraw from */
  note: Note;

  /** Amount to withdraw in wei */
  withdrawAmountWei: bigint;

  /** Recipient address (hex) */
  recipient: `0x${string}`;

  /** Account key for deriving nullifiers and secrets */
  accountKey: bigint;

  /** Destination chain ID for cross-chain withdrawals */
  destinationChainId?: number;

  /** User-configured solver fee in basis points (cross-chain only) */
  solverFeeBPS?: number;
}

export interface WithdrawalPipelineContext {
  kind: WithdrawalKind;
  request: WithdrawalRequest;
  feeQuote: FeeQuote;
  poolScope: bigint;
  derivation: WithdrawalDerivation | CrosschainWithdrawalDerivation;
  withdrawalData: readonly [`0x${string}`, `0x${string}`];
}

/** Circuit inputs for same-chain withdrawal */
export interface SameChainWithdrawalCircuitInputs {
  withdrawAmount: bigint;
  noteAmount: bigint;
  label: bigint;
}

/** Circuit inputs for cross-chain withdrawal (includes fee fields) */
export interface CrossChainWithdrawalCircuitInputs extends SameChainWithdrawalCircuitInputs {
  relayFeeBPS: bigint;
  refundFeeBPS: bigint;
}

export interface WithdrawalWitness {
  context: WithdrawalPipelineContext;
  stateTreeLeaves: bigint[];
  aspTreeLeaves: bigint[];
  circuitInputs: SameChainWithdrawalCircuitInputs | CrossChainWithdrawalCircuitInputs;
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
  context: WithdrawalPipelineContext | Withdraw2PipelineContext;
  proof: WithdrawalProof | Withdraw2Proof;
  userOperation: UserOperation<"0.7">;
  smartAccountClient: SmartAccountClient;
  gasLimits: GasLimits;
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

// ============ WITHDRAW2 (2:1) TYPES ============

/**
 * Type of withdrawal: standard (1:1) or withdraw2 (2:1 merge)
 */
export type WithdrawalType = "standard" | "withdraw2";

/**
 * Request for a Withdraw2 (2:1 merge) operation
 */
export interface Withdraw2Request {
  /** Primary note (larger depositIndex, chain continues) */
  primaryNote: Note;

  /** Secondary note (smaller depositIndex, chain terminates) */
  secondaryNote: Note;

  /** Amount to withdraw in wei */
  withdrawAmountWei: bigint;

  /** Recipient address (hex) */
  recipient: `0x${string}`;

  /** Account key for deriving nullifiers and secrets */
  accountKey: bigint;

  /** Destination chain ID for cross-chain withdrawals */
  destinationChainId?: number;

  /** Label selector: 0 = use primary's label, 1 = use secondary's label */
  labelSelector?: 0 | 1;

  /** User-configured solver fee in basis points (cross-chain only) */
  solverFeeBPS?: number;
}

export interface Withdraw2PipelineContext {
  kind: WithdrawalKind;
  request: Withdraw2Request;
  feeQuote: FeeQuote;
  poolScope: bigint;
  derivation: Withdraw2Derivation | CrosschainWithdraw2Derivation;
  withdrawalData: readonly [`0x${string}`, `0x${string}`];
}

/** Circuit inputs for same-chain withdraw2 */
export interface SameChainWithdraw2CircuitInputs {
  withdrawAmount: bigint;
  primaryNoteAmount: bigint;
  primaryLabel: bigint;
  secondaryNoteAmount: bigint;
  secondaryLabel: bigint;
}

/** Circuit inputs for cross-chain withdraw2 (includes fee fields) */
export interface CrossChainWithdraw2CircuitInputs extends SameChainWithdraw2CircuitInputs {
  relayFeeBPS: bigint;
  refundFeeBPS: bigint;
}

export interface Withdraw2Witness {
  context: Withdraw2PipelineContext;
  stateTreeLeaves: bigint[];
  aspTreeLeaves: bigint[];
  circuitInputs: SameChainWithdraw2CircuitInputs | CrossChainWithdraw2CircuitInputs;
}

export interface Withdraw2Proof {
  witness: Withdraw2Witness;
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
}
