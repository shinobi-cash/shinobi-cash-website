/**
 * @shinobi-cash/core/account — Type definitions
 */

import type { SpendableNote } from "../discovery/types.js";
import type { CircuitFetcher } from "../proof/types.js";
import type { DepositSettings } from "../deposit/index.js";
import type { GasLimits, WithdrawalKind, WithdrawalFeeQuote } from "../fees/index.js";

// ============================================================================
// Credential
// ============================================================================

export type ShinobiCredential = { type: "privateKey"; privateKey: string };

// ============================================================================
// Config
// ============================================================================

export interface ShinobiAccountConfig {
  credential: ShinobiCredential;
  /** Optional circuit file fetcher — defaults to HTTP from `/circuits/` */
  getCircuits?: CircuitFetcher;
}

// ============================================================================
// Return Types
// ============================================================================

/** Framework-agnostic transaction request — any wallet can send this */
export interface TransactionRequest {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  chainId: number;
}

/** Prepared withdrawal for bundler submission (ERC-4337) */
export interface PreparedWithdrawal {
  callData: `0x${string}`;
  to: `0x${string}`;
  feeQuote: WithdrawalFeeQuote;
  gasLimits: GasLimits;
  paymasterAddress: `0x${string}`;
  kind: WithdrawalKind;
}

/** Prepared withdrawal refund for bundler submission */
export interface PreparedWithdrawalRefund {
  callData: `0x${string}`;
  to: `0x${string}`;
  gasLimits: GasLimits;
  paymasterAddress: `0x${string}`;
}

export type { WithdrawalFeeQuote } from "../fees/index.js";

// ============================================================================
// Method Params
// ============================================================================

export interface DepositParams {
  poolAddress: `0x${string}`;
  amountWei: bigint;
  chainId: number;
  depositIndex: number;
  settings?: DepositSettings;
  useDefaults?: boolean;
}

export interface WithdrawQuoteParams {
  amountWei: bigint;
  destinationChainId?: number;
  gasPriceWei: bigint;
}

export interface WithdrawParams extends WithdrawQuoteParams {
  poolAddress: `0x${string}`;
  note: SpendableNote;
  recipient: `0x${string}`;
  poolScope: bigint;
  stateCommitments: bigint[];
  aspLabels: bigint[];
}

export interface Withdraw2Params {
  poolAddress: `0x${string}`;
  primaryNote: SpendableNote;
  secondaryNote: SpendableNote;
  amountWei: bigint;
  recipient: `0x${string}`;
  destinationChainId?: number;
  gasPriceWei: bigint;
  poolScope: bigint;
  stateCommitments: bigint[];
  aspLabels: bigint[];
  labelSelector?: 0 | 1;
}

export interface RagequitParams {
  poolAddress: `0x${string}`;
  note: SpendableNote;
}

export interface RefundDepositParams {
  rawIntent: import("@shinobi-cash/data").RawShinobiIntent;
  settlerAddress: `0x${string}`;
  originChainId: number;
}

export interface WithdrawalRefundParams {
  rawIntent: import("@shinobi-cash/data").RawShinobiIntent;
  settlerAddress: `0x${string}`;
}

// ============================================================================
// ShinobiAccount Interface
// ============================================================================

export interface ShinobiAccount {
  readonly accountId: string;

  // Crypto derivations (accountSecret stays in closure)
  derivePrecommitment(poolAddress: string, chainId: number, depositIndex: number): string;
  deriveNullifierHash(poolAddress: string, chainId: number, depositIndex: number, changeIndex: number, noteType?: string): string;
  deriveNoteCommitment(note: SpendableNote): bigint;

  // Deposit → TransactionRequest
  deposit(params: DepositParams): TransactionRequest;

  // Withdrawal → PreparedWithdrawal (for bundler)
  prepareWithdrawal(params: WithdrawParams): Promise<PreparedWithdrawal>;
  prepareWithdraw2(params: Withdraw2Params): Promise<PreparedWithdrawal>;

  // Ragequit → TransactionRequest
  ragequit(params: RagequitParams): Promise<TransactionRequest>;

  // Refund → TransactionRequest or PreparedRefund
  refundDeposit(params: RefundDepositParams): TransactionRequest;
  prepareWithdrawalRefund(params: WithdrawalRefundParams): PreparedWithdrawalRefund;
}
