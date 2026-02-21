/**
 * Activity types from the v2 indexer
 */
export type ActivityType =
  | "DEPOSIT"
  | "WITHDRAW"
  | "WITHDRAW_2"
  | "CROSSCHAIN_DEPOSIT_INTENT"
  | "CROSSCHAIN_DEPOSIT_FILL"
  | "CROSSCHAIN_DEPOSIT_REFUND"
  | "CROSSCHAIN_WITHDRAW_INTENT"
  | "CROSSCHAIN_WITHDRAW_2_INTENT"
  | "CROSSCHAIN_WITHDRAWAL_FILL"
  | "CROSSCHAIN_WITHDRAWAL_REFUND"
  | "RAGEQUIT";

/**
 * Primary activity types (user-initiated operations)
 */
export type UserActivityType =
  | "DEPOSIT"
  | "CROSSCHAIN_DEPOSIT_INTENT"
  | "WITHDRAW"
  | "WITHDRAW_2"
  | "CROSSCHAIN_WITHDRAW_INTENT"
  | "CROSSCHAIN_WITHDRAW_2_INTENT"
  | "RAGEQUIT";

/**
 * ASP (Association Set Provider) status
 */
export type ASPStatus = "pending" | "approved";

// ============================================
// Base Activity Fields
// ============================================

/**
 * Common fields present in all activity types
 */
interface BaseActivity {
  txHash: string;
  chainId: string;
  timestamp: string;
  user: string;
  pool: string;
  amount: string;
}

// ============================================
// Deposit Activity Types
// ============================================

/**
 * Same-chain deposit activity
 */
export interface DepositActivity extends BaseActivity {
  type: "DEPOSIT";
  aspStatus: ASPStatus | null;
  commitment: string;
  label: string;
  precommitment: string;
  originalAmount: string;
  vettingFeeAmount: string;
  vettingFeeRecipient: string;
}

/**
 * Crosschain deposit fill activity (on pool chain)
 */
export interface CrosschainDepositFillActivity extends BaseActivity {
  type: "CROSSCHAIN_DEPOSIT_FILL";
  orderId: string;
  aspStatus: ASPStatus | null;
  commitment: string;
  label: string;
  precommitment: string;
  originalAmount: string;
  vettingFeeAmount: string;
  vettingFeeRecipient: string;
  solver: string;
}

/**
 * Crosschain deposit intent activity (on origin chain)
 */
export interface CrosschainDepositIntentActivity extends BaseActivity {
  type: "CROSSCHAIN_DEPOSIT_INTENT";
  orderId: string;
  precommitment: string;
  destinationChainId: string;
  destinationPool: string;
  totalPaid: string;
  netDepositAmount: string;
  asset: string;
  solverFee: string;
}

/**
 * Crosschain deposit refund activity
 */
export interface CrosschainDepositRefundActivity extends BaseActivity {
  type: "CROSSCHAIN_DEPOSIT_REFUND";
  orderId: string;
}

// ============================================
// Withdrawal Activity Types
// ============================================

/**
 * Same-chain 1:1 withdrawal activity
 */
export interface WithdrawActivity extends BaseActivity {
  type: "WITHDRAW";
  asset: string;
  nullifierCount: number;
  newCommitment: string;
  withdrawnValue: string;
  relayer: string;
  recipient: string;
  relayFee: string;
  spentNullifiers: readonly string[];
}

/**
 * Same-chain 2:1 withdrawal activity
 */
export interface Withdraw2Activity extends BaseActivity {
  type: "WITHDRAW_2";
  asset: string;
  nullifierCount: number;
  newCommitment: string;
  withdrawnValue: string;
  relayer: string;
  recipient: string;
  relayFee: string;
  spentNullifiers: readonly string[];
}

/**
 * Crosschain 1:1 withdrawal intent activity
 */
export interface CrosschainWithdrawIntentActivity extends BaseActivity {
  type: "CROSSCHAIN_WITHDRAW_INTENT";
  orderId: string;
  asset: string;
  nullifierCount: number;
  newCommitment: string;
  withdrawnValue: string;
  relayer: string;
  recipient: string;
  relayFee: string;
  refundCommitment: string;
  solverFee: string;
  spentNullifiers: readonly string[];
}

/**
 * Crosschain 2:1 withdrawal intent activity
 */
export interface CrosschainWithdraw2IntentActivity extends BaseActivity {
  type: "CROSSCHAIN_WITHDRAW_2_INTENT";
  orderId: string;
  asset: string;
  nullifierCount: number;
  newCommitment: string;
  withdrawnValue: string;
  relayer: string;
  recipient: string;
  relayFee: string;
  refundCommitment: string;
  solverFee: string;
  spentNullifiers: readonly string[];
}

/**
 * Crosschain withdrawal fill activity (on destination chain)
 */
export interface CrosschainWithdrawalFillActivity extends BaseActivity {
  type: "CROSSCHAIN_WITHDRAWAL_FILL";
  orderId: string;
  solver: string;
  recipient: string;
}

/**
 * Crosschain withdrawal refund activity
 */
export interface CrosschainWithdrawalRefundActivity extends BaseActivity {
  type: "CROSSCHAIN_WITHDRAWAL_REFUND";
  orderId: string;
  refundCommitment: string;
  netRefundAmount: string;
  refundFee: string;
  refundFeeRecipient: string;
}

// ============================================
// Ragequit Activity Type
// ============================================

/**
 * Ragequit activity
 */
export interface RagequitActivity extends BaseActivity {
  type: "RAGEQUIT";
  commitment: string;
  label: string;
}

// ============================================
// Union Types
// ============================================

/**
 * Union of all activity types
 */
export type ActivityItem =
  | DepositActivity
  | CrosschainDepositFillActivity
  | CrosschainDepositIntentActivity
  | CrosschainDepositRefundActivity
  | WithdrawActivity
  | Withdraw2Activity
  | CrosschainWithdrawIntentActivity
  | CrosschainWithdraw2IntentActivity
  | CrosschainWithdrawalFillActivity
  | CrosschainWithdrawalRefundActivity
  | RagequitActivity;

// ============================================
// Activity Timeline Types
// ============================================

/**
 * Timeline event for crosschain operations
 */
export interface TimelineEvent {
  txHash: string;
  chainId: string;
  timestamp: string;
  type: ActivityType;
}

/**
 * Activity detail response with timeline
 */
export interface ActivityDetailResponse {
  activity: ActivityItem;
  timeline: TimelineEvent[] | null;
}

// ============================================
// Stats Types
// ============================================

/**
 * Deposit statistics from /v2/stats endpoint
 */
export interface DepositStats {
  pool: string;
  chainId: string;
  depositCount: string;
  totalDeposited: string;
  uniqueDepositors: string;
  totalVettingFees: string;
}

/**
 * Withdrawal statistics from /v2/stats endpoint
 */
export interface WithdrawalStats {
  pool: string;
  chainId: string;
  withdrawalCount: string;
  totalWithdrawn: string;
  totalRelayFees: string;
}

/**
 * Sponsorship statistics from /v2/stats endpoint
 */
export interface SponsorshipStats {
  chainId: string;
  type: string;
  sponsorshipCount: string;
  totalCost: string;
  totalRefunded: string;
  successCount: string;
}

/**
 * Ragequit statistics from /v2/stats endpoint
 */
export interface RagequitStats {
  pool: string;
  chainId: string;
  ragequitCount: string;
  totalRagequitAmount: string;
}

/**
 * Combined stats response from /v2/stats endpoint
 */
export interface StatsResponse {
  deposits: DepositStats[];
  withdrawals: WithdrawalStats[];
  ragequits: RagequitStats[];
  sponsorships: SponsorshipStats[];
}

// ============================================
// Pagination Types
// ============================================

/**
 * Pagination metadata in API responses
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

/**
 * Paginated API response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Pagination options for requests
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// ============================================
// Filter Types
// ============================================

/**
 * Activity endpoint filters
 */
export interface ActivityFilters {
  pool?: string;
  type?: UserActivityType;
  chainId?: string | number;
  user?: string;
  aspStatus?: ASPStatus;
}

/**
 * Stats endpoint filters
 */
export interface StatsFilters {
  pool?: string;
  chainId?: string | number;
}

// ============================================
// State Tree Types
// ============================================

/**
 * Single leaf in the merkle tree
 */
export interface StateTreeLeaf {
  leafIndex: string;
  commitment: string;
}

/**
 * State tree response from /v2/state-tree endpoint
 */
export interface StateTreeResponse {
  pool: string;
  merkleRoot: string | null;
  treeSize: string;
  data: StateTreeLeaf[];
  pagination: PaginationMeta;
}

// ============================================
// Intent Types
// ============================================

/**
 * Intent type
 */
export type IntentType = "DEPOSIT" | "WITHDRAWAL";

/**
 * Intent phase (lifecycle state)
 */
export type IntentPhase = "ESCROWED" | "FILLED" | "FINALIZED" | "REFUNDED";

/**
 * MandateOutput from the ShinobiIntent struct
 */
export interface RawMandateOutput {
  oracle: string;
  settler: string;
  chainId: string;
  token: string;
  amount: string;
  recipient: string;
  call: string;
  context: string;
}

/**
 * Raw ShinobiIntent struct fields needed for contract calls (e.g. refund).
 * Returned by the /v2/intents/:orderId endpoint.
 */
export interface RawShinobiIntent {
  user: string;
  nonce: string;
  originChainId: string;
  expires: string;
  fillDeadline: string;
  fillOracle: string;
  inputs: Array<[string, string]>;
  outputs: RawMandateOutput[];
  intentOracle: string;
  refundCalldata: string;
}

/**
 * Intent from /v2/intents endpoint
 */
export interface Intent {
  orderId: string;
  intentType: IntentType;
  phase: IntentPhase;
  user: string;
  inputToken: string;
  inputAmount: string;
  outputToken: string;
  outputAmount: string;
  outputRecipient: string;
  originChainId: string;
  destinationChainId: string;
  fillDeadline: string;
  expires: string;

  // ESCROWED phase
  escrowTxHash: string;
  escrowTimestamp: string;

  // FILLED phase (nullable)
  fillTxHash: string | null;
  fillChainId: string | null;
  fillTimestamp: string | null;
  solver: string | null;
  fillAmount: string | null;
  fillRecipient: string | null;
  pool: string | null;

  // FINALIZED phase (nullable)
  finalizeTxHash: string | null;
  finalizeChainId: string | null;
  finalizeTimestamp: string | null;

  // REFUNDED phase (nullable)
  refundTxHash: string | null;
  refundChainId: string | null;
  refundTimestamp: string | null;
  refundAmount: string | null;
  refundFee: string | null;

  // Raw intent struct (returned by detail endpoint for contract calls)
  rawIntent?: RawShinobiIntent;
}

/**
 * Intent endpoint filters
 */
export interface IntentFilters {
  intentType?: IntentType;
  phase?: IntentPhase;
}

// ============================================
// Pool Types
// ============================================

/**
 * Pool registration from /v2/pools endpoint
 */
export interface Pool {
  pool: string;
  asset: string;
  scope: string;
  timestamp: string;
  txHash: string;
}

// ============================================
// Client Types
// ============================================

/**
 * Client configuration options
 */
export interface IndexerClientOptions {
  endpoint: string;
  authToken?: string;
  timeout?: number;
}
