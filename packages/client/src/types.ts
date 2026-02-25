/**
 * @shinobi-cash/client — Type definitions
 *
 * ShinobiCashClient wraps ShinobiAccount with chain interaction:
 * bundler (Pimlico), indexer data, contract reads, solver quotes.
 */

import type {
  ShinobiAccount,
  PreparedWithdrawal,
  PreparedWithdrawalRefund,
} from "@shinobi-cash/core/account";
import type { WithdrawalFeeQuote } from "@shinobi-cash/core/fees";
import type {
  SpendableNote,
  NoteTree,
  DiscoveryOptions,
  DiscoveryResult,
  PersistenceCallbacks,
  ActivityItem,
  ActivityFetcher,
} from "@shinobi-cash/core/discovery";
import type { RawShinobiIntent } from "@shinobi-cash/data";

// ============================================================================
// Client Config
// ============================================================================

export interface ShinobiCashClientConfig {
  account: ShinobiAccount;
  poolAddress: `0x${string}`;
  indexer: ClientIndexer;
  bundlerUrl: string;
  rpcUrl?: string;
  solverUrl?: string;
  persistence?: PersistenceCallbacks;
}

/**
 * Minimal indexer interface — app provides implementation
 * (decoupled from @shinobi-cash/data URL patterns)
 */
export interface ClientIndexer {
  getStateTree(poolAddress: string): Promise<{ leaves: { commitment: string }[] }>;
  getApprovedLabels(): Promise<string[]>;
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

// ============================================================================
// Prepared Operations (opaque — pass to submitWithdrawal())
// ============================================================================

export interface PreparedWithdrawalOp {
  readonly kind: "withdrawal";
  readonly feeQuote: WithdrawalFeeQuote;
  /** @internal */
  readonly _internal: unknown;
}

export interface PreparedRefundOp {
  readonly kind: "refund";
  /** @internal */
  readonly _internal: unknown;
}

// ============================================================================
// Client Method Params (simplified — no poolScope, stateTree, aspData)
// ============================================================================

export interface ClientWithdrawParams {
  note: SpendableNote;
  amountWei: bigint;
  recipient: `0x${string}`;
  destinationChainId?: number;
}

export interface ClientWithdraw2Params {
  primaryNote: SpendableNote;
  secondaryNote: SpendableNote;
  amountWei: bigint;
  recipient: `0x${string}`;
  destinationChainId?: number;
  labelSelector?: 0 | 1;
}

export interface ClientWithdrawalRefundParams {
  rawIntent: RawShinobiIntent;
  settlerAddress: `0x${string}`;
}

// ============================================================================
// Client Interface
// ============================================================================

export interface ShinobiCashClient {
  readonly account: ShinobiAccount;
  readonly accountId: string;

  // Discovery (client owns note discovery)
  sync(options?: DiscoveryOptions): Promise<DiscoveryResult>;
  getSpendableNotes(): SpendableNote[];
  getBalance(): bigint;
  getNextDepositIndex(chainId: number): number;
  getActivities(): ActivityItem[];

  // Withdrawal (orchestrated — fetches context, builds proof, prepares UserOp)
  prepareWithdrawal(params: ClientWithdrawParams): Promise<PreparedWithdrawalOp>;
  prepareWithdraw2(params: ClientWithdraw2Params): Promise<PreparedWithdrawalOp>;
  submitWithdrawal(
    prepared: PreparedWithdrawalOp | PreparedRefundOp,
    options?: { onSubmitted?: (userOpHash: string) => void }
  ): Promise<string>;

  // Withdrawal refund (bundler-based)
  prepareWithdrawalRefund(params: ClientWithdrawalRefundParams): Promise<PreparedRefundOp>;

  // Fee quoting (fetches gas price from bundler, delegates to account)
  quoteWithdrawal(params: { amountWei: bigint; destinationChainId?: number }): Promise<WithdrawalFeeQuote>;
  quoteWithdraw2(params: { amountWei: bigint; destinationChainId?: number }): Promise<WithdrawalFeeQuote>;

  // Contract reads
  fetchPoolScope(): Promise<bigint>;

  // Solver / cross-chain
  getSolverQuote(params: SolverQuoteRequest): Promise<SolverQuote>;
  isCrossChainEnabled(): boolean;

  // Bundler
  getBundlerGasPrice(): Promise<bigint>;
}
