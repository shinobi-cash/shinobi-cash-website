/**
 * @shinobi-cash/core/account — Type definitions
 */

import type { SpendableNote, DiscoveryOptions, DiscoveryResult, ActivityFetcher, PersistenceCallbacks } from "../discovery/types.js";
import type { ProofGenerator } from "../proof/types.js";
import type { DepositSettings } from "../deposit/index.js";
import type { GasLimits, WithdrawalKind } from "../fees/index.js";

// ============================================================================
// Config
// ============================================================================

export interface ShinobiAccountConfig {
  accountKey: bigint;
  publicKey: string;
  poolAddress?: `0x${string}`;
  proofGenerator: ProofGenerator;
  activityFetcher: ActivityFetcher;
  persistence?: PersistenceCallbacks;
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

export interface WithdrawalFeeQuote {
  relayFeeBPS: number;
  solverFeeBPS: number;
  executionFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
  netAmountWei: bigint;
}

// ============================================================================
// Method Params
// ============================================================================

export interface DepositParams {
  amountWei: bigint;
  chainId: number;
  settings?: DepositSettings;
  useDefaults?: boolean;
}

export interface WithdrawQuoteParams {
  amountWei: bigint;
  destinationChainId?: number;
  gasPriceWei: bigint;
}

export interface WithdrawParams extends WithdrawQuoteParams {
  note: SpendableNote;
  recipient: `0x${string}`;
  poolScope: bigint;
  stateCommitments: bigint[];
  aspLabels: bigint[];
}

export interface Withdraw2Params {
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
  readonly publicKey: string;
  readonly poolAddress: `0x${string}`;

  // Discovery
  sync(options?: DiscoveryOptions): Promise<DiscoveryResult>;
  getSpendableNotes(): SpendableNote[];
  getBalance(): bigint;
  getNextDepositIndex(chainId: number): number;

  // Deposit → TransactionRequest
  deposit(params: DepositParams): TransactionRequest;

  // Withdrawal → PreparedWithdrawal (for bundler)
  quoteWithdrawal(params: WithdrawQuoteParams): WithdrawalFeeQuote;
  prepareWithdrawal(params: WithdrawParams): Promise<PreparedWithdrawal>;
  prepareWithdraw2(params: Withdraw2Params): Promise<PreparedWithdrawal>;

  // Ragequit → TransactionRequest
  ragequit(params: RagequitParams): Promise<TransactionRequest>;

  // Refund → TransactionRequest or PreparedRefund
  refundDeposit(params: RefundDepositParams): TransactionRequest;
  prepareWithdrawalRefund(params: WithdrawalRefundParams): PreparedWithdrawalRefund;
}
