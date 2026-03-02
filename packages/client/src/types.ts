/**
 * @shinobi-cash/client — Type definitions
 *
 * Capabilities are composed via .extend():
 *   createShinobiCashClient({ account, indexer })
 *     .extend(withDeposit())
 *     .extend(withCrosschainDeposit(solver))
 *     .extend(withWithdrawal(relayer))
 *     .extend(withCrosschainWithdrawal(relayer, solver))
 */

import type { ShinobiAccount, Call } from "@shinobi-cash/core/account";
import type { WithdrawalFeeQuote, DepositFeeQuote } from "@shinobi-cash/core/fees";
import type { DepositSettings } from "@shinobi-cash/core/deposit";
import type {
  SpendableNote,
  NoteTree,
  DiscoveryOptions,
  DiscoveryResult,
  StorageLayer,
  SerializableDiscoveryState,
  ActivityItem,
  ActivityFetcher,
} from "@shinobi-cash/core/discovery";
import type { RawShinobiIntent } from "@shinobi-cash/data";
import type { SupportedChainId } from "@shinobi-cash/constants";
import type { PublicClient, WalletClient, TransactionReceipt } from "viem";

// ============================================================================
// Client Context (internal — used by extensions)
// ============================================================================

/** @internal — shared state passed to extensions via .extend() */
export interface ClientContext {
  account: ShinobiAccount;
  poolAddress: `0x${string}`;
  ipfsGateways?: string[];
  getNextDepositIndex(chainId: number): number;
  fetchContext(): Promise<{
    poolScope: bigint;
    stateCommitments: bigint[];
    aspRootCid: string;
  }>;
}

// ============================================================================
// Relayer
// ============================================================================

export type RelayOperationType =
  | "withdraw"
  | "withdraw-crosschain"
  | "withdraw2"
  | "withdraw2-crosschain"
  | "refund";

export interface ShinobiRelayer {
  getRelayAddress(type: RelayOperationType): `0x${string}`;

  quoteRelayFee(params: {
    type: RelayOperationType;
    amountWei: bigint;
  }): Promise<{ relayFeeBPS: number }>;

  sendTransaction(params: { call: Call; type: RelayOperationType }): Promise<string>;

  waitForReceipt(txId: string): Promise<TransactionReceipt>;
}

// ============================================================================
// Client Config
// ============================================================================

export type ShinobiCashClientConfig = {
  account: ShinobiAccount;
  indexer: ShinobiIndexer;
  /** Override default public clients for specific supported chains */
  publicClients?: Partial<Record<SupportedChainId, PublicClient>>;
  ipfsGateways?: string[];
} & (
  | { storage: StorageLayer; cachedState?: never }
  | { storage?: never; cachedState?: SerializableDiscoveryState }
);

/**
 * Minimal indexer interface — app provides implementation
 * (decoupled from @shinobi-cash/data URL patterns)
 */
export interface ShinobiIndexer {
  getStateTree(poolAddress: string): Promise<{ leaves: { commitment: string }[] }>;
  getASPRootInfo(): Promise<{ aspRoot: string; ipfsCid: string } | null>;
  getActivities: ActivityFetcher;
}

// ============================================================================
// Solver Types
// ============================================================================

export interface SolverQuoteRequest {
  originChainId: number;
  destinationChainId: number;
  amountWei: string;
  type: "deposit" | "withdrawal";
}

export interface SolverQuote {
  solverFeeBPS: number;
  fillDeadlineSeconds: number;
  expirySeconds: number;
  maxSolverFeeBPS: number;
}

/** Solver interface — app provides implementation for cross-chain operations */
export interface ShinobiSolver {
  getQuote(params: SolverQuoteRequest): Promise<SolverQuote>;
}

// ============================================================================
// Prepared Operations
// ============================================================================

export interface PreparedWithdrawalOp {
  readonly kind: "withdrawal";
  readonly feeQuote: WithdrawalFeeQuote;
  /** @internal — used by submitWithdrawal */
  readonly call: Call;
  /** @internal — used by submitWithdrawal */
  readonly type: RelayOperationType;
}

// ============================================================================
// Deposit Params
// ============================================================================

export interface ClientDepositParams {
  amountWei: bigint;
}

export interface ClientCrosschainDepositParams {
  amountWei: bigint;
  chainId: number;
  settings?: DepositSettings;
  useDefaults?: boolean;
}

// ============================================================================
// Withdrawal Params
// ============================================================================

/** Same-chain withdrawal — no destinationChainId */
export interface ClientWithdrawParams {
  note: SpendableNote;
  amountWei: bigint;
  recipient: `0x${string}`;
}

/** Same-chain withdraw2 — no destinationChainId */
export interface ClientWithdraw2Params {
  primaryNote: SpendableNote;
  secondaryNote: SpendableNote;
  amountWei: bigint;
  recipient: `0x${string}`;
  labelSelector?: 0 | 1;
}

/** Cross-chain withdrawal — requires destinationChainId */
export interface ClientCrosschainWithdrawParams {
  note: SpendableNote;
  amountWei: bigint;
  recipient: `0x${string}`;
  destinationChainId: number;
}

/** Cross-chain withdraw2 — requires destinationChainId */
export interface ClientCrosschainWithdraw2Params {
  primaryNote: SpendableNote;
  secondaryNote: SpendableNote;
  amountWei: bigint;
  recipient: `0x${string}`;
  destinationChainId: number;
  labelSelector?: 0 | 1;
}

export interface ClientRagequitParams {
  note: SpendableNote;
}

export interface ClientWithdrawalRefundParams {
  rawIntent: RawShinobiIntent;
  settlerAddress: `0x${string}`;
}

export interface ClientDepositRefundParams {
  rawIntent: RawShinobiIntent;
  settlerAddress: `0x${string}`;
}

// ============================================================================
// Base Client Interface
// ============================================================================

export interface BaseShinobiCashClient {
  readonly account: ShinobiAccount;
  readonly accountId: string;

  // Discovery
  sync(options?: DiscoveryOptions): Promise<DiscoveryResult>;
  getSpendableNotes(): SpendableNote[];
  getBalance(): bigint;
  getActivities(): ActivityItem[];

  // Chain utilities
  estimateGas(
    params: { to: `0x${string}`; data: `0x${string}`; value: bigint; account?: `0x${string}` },
    chainId: number
  ): Promise<bigint>;
  getGasPrice(chainId: number): Promise<bigint>;
  waitForTransaction(
    txHash: `0x${string}`,
    chainId: number
  ): Promise<{ status: "success" | "reverted" }>;

  // Extend client with additional capabilities
  extend<T extends object>(fn: (ctx: ClientContext) => T): this & T;
}

// ============================================================================
// Action Interfaces
// ============================================================================

/** Methods added by withDeposit() — same-chain deposit + ragequit */
export interface DepositActions {
  quoteDeposit(params: { amountWei: bigint }): DepositFeeQuote;
  prepareDeposit(params: ClientDepositParams): Call;
  deposit(call: Call, walletClient: WalletClient): Promise<`0x${string}`>;
  prepareRagequit(params: ClientRagequitParams): Promise<Call>;
  ragequit(call: Call, walletClient: WalletClient): Promise<`0x${string}`>;
}

/** Methods added by withCrosschainDeposit(solver) — crosschain deposit + deposit refund + solver quote */
export interface CrosschainDepositActions {
  quoteCrosschainDeposit(params: { amountWei: bigint; solverFeeBPS?: number }): DepositFeeQuote;
  prepareCrosschainDeposit(params: ClientCrosschainDepositParams): Call;
  prepareDepositRefund(params: ClientDepositRefundParams): Call;
  depositRefund(call: Call, walletClient: WalletClient): Promise<`0x${string}`>;
  getSolverQuote(params: SolverQuoteRequest): Promise<SolverQuote>;
}

/** Methods added by withWithdrawal(relayer) — same-chain withdrawal */
export interface WithdrawalActions {
  quoteWithdrawal(params: { amountWei: bigint }): Promise<WithdrawalFeeQuote>;
  quoteWithdraw2(params: { amountWei: bigint }): Promise<WithdrawalFeeQuote>;
  prepareWithdrawal(params: ClientWithdrawParams): Promise<PreparedWithdrawalOp>;
  prepareWithdraw2(params: ClientWithdraw2Params): Promise<PreparedWithdrawalOp>;
  submitWithdrawal(prepared: PreparedWithdrawalOp): Promise<`0x${string}`>;
}

/** Methods added by withCrosschainWithdrawal(relayer, solver) — crosschain withdrawal + refund + solver quote */
export interface CrosschainWithdrawalActions {
  quoteCrosschainWithdrawal(params: {
    amountWei: bigint;
    destinationChainId: number;
  }): Promise<WithdrawalFeeQuote>;
  quoteCrosschainWithdraw2(params: {
    amountWei: bigint;
    destinationChainId: number;
  }): Promise<WithdrawalFeeQuote>;
  prepareCrosschainWithdrawal(
    params: ClientCrosschainWithdrawParams
  ): Promise<PreparedWithdrawalOp>;
  prepareCrosschainWithdraw2(
    params: ClientCrosschainWithdraw2Params
  ): Promise<PreparedWithdrawalOp>;
  submitWithdrawal(prepared: PreparedWithdrawalOp): Promise<`0x${string}`>;
  prepareWithdrawalRefund(params: ClientWithdrawalRefundParams): Call;
  submitWithdrawalRefund(call: Call): Promise<`0x${string}`>;
  getSolverQuote(params: SolverQuoteRequest): Promise<SolverQuote>;
}

// ============================================================================
// Full Client (convenience alias — base + all extensions)
// ============================================================================

export type ShinobiCashClient = BaseShinobiCashClient &
  DepositActions &
  CrosschainDepositActions &
  WithdrawalActions &
  CrosschainWithdrawalActions;
