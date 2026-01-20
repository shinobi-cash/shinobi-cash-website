/**
 * TypeScript type definitions for Shinobi Cash indexer
 * Based on the privacy pool indexer GraphQL schema
 *
 * These types match the indexer entities:
 * - Activity (unified timeline of deposits, withdrawals, cross-chain intents)
 * - Pool (privacy pool configuration and statistics)
 * - StateTreeLeaf (merkle tree commitments for ZK proofs)
 * - ASPApprovalList (association set of participants)
 * - CrossChainIntent (cross-chain deposit/withdrawal intents)
 */

/**
 * ========================================
 * ENUMS
 * ========================================
 */

/**
 * Activity types for the unified timeline
 */
export type ActivityType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'CROSSCHAIN_DEPOSIT'
  | 'CROSSCHAIN_WITHDRAWAL';

/**
 * ASP (Approved Set of Participants) status
 */
export type ASPStatus = 'pending' | 'approved' | 'rejected';

/**
 * ========================================
 * CORE ENTITY TYPES
 * ========================================
 */

/**
 * Activity entity
 * Unified timeline of all privacy pool events
 */
export interface Activity {
  /** Unique identifier */
  id: string;
  /** Activity type */
  type: ActivityType;
  /** ASP approval status */
  aspStatus: ASPStatus;
  /** Pool this activity belongs to */
  poolId: string;
  /** User address */
  user: string;
  /** Recipient address (for withdrawals) */
  recipient?: string;

  /** Amount (may be null for pending cross-chain deposits) */
  amount: bigint | null;
  /** Original amount before fees */
  originalAmount?: bigint;
  /** Vetting fee amount (for ASP) */
  vettingFeeAmount?: bigint;

  /** Commitment hash */
  commitment: string;
  /** Label (inserted commitment, null if not yet activated) */
  label?: string | null;
  /** Precommitment hash (for matching deposits) */
  precommitmentHash?: string;
  /** Spent nullifier (for withdrawals) */
  spentNullifier?: string;
  /** New commitment (for change notes) */
  newCommitment?: string;
  /** Refund commitment */
  refundCommitment?: string;

  /** Fee amount */
  feeAmount?: bigint;
  /** Fee refund amount */
  feeRefund?: bigint;
  /** Relayer address */
  relayer?: string;

  /** Whether operation was sponsored (AA) */
  isSponsored?: boolean;
  /** Whether operation was refunded */
  isRefunded?: boolean;

  /** Cross-chain order ID */
  orderId?: string;

  /** Block number */
  blockNumber: bigint;
  /** Timestamp */
  timestamp: bigint;

  /** Origin transaction hash */
  originTransactionHash: string;
  /** Destination transaction hash (for cross-chain) */
  destinationTransactionHash?: string;

  /** Origin chain ID */
  originChainId: bigint;
  /** Destination chain ID (for cross-chain) */
  destinationChainId?: bigint;
}

/**
 * Pool entity
 * Privacy pool configuration and statistics
 */
export interface Pool {
  /** Pool address (unique identifier) */
  id: string;
  /** Total deposits in wei */
  totalDeposits: bigint;
  /** Total withdrawals in wei */
  totalWithdrawals: bigint;
  /** Number of deposits */
  depositCount: bigint;
  /** Pool creation timestamp */
  createdAt: bigint;
}

/**
 * StateTreeLeaf entity (MerkleTreeLeaf in schema)
 * Merkle tree commitments for ZK proof generation
 */
export interface StateTreeLeaf {
  /** Leaf index in the merkle tree */
  leafIndex: bigint;
  /** Leaf value (commitment) */
  leafValue: string;
  /** Tree root at this point */
  treeRoot: string;
  /** Tree size at this point */
  treeSize: bigint;
  /** Pool this leaf belongs to */
  poolId: string;
}

/**
 * ASPApprovalList entity (AssociationSetUpdate in schema)
 * Approved set of participants root and IPFS CID
 */
export interface ASPApprovalList {
  /** Unique identifier */
  id: string;
  /** Merkle root of approved labels */
  root: string;
  /** IPFS CID containing the approval list */
  ipfsCID: string;
  /** Timestamp of update */
  timestamp: bigint;
}

/**
 * CrossChainIntent entity
 * Cross-chain deposit/withdrawal intent tracking
 */
export interface CrossChainIntent {
  /** Unique identifier (order ID) */
  id: string;
  /** Intent type */
  type: 'DEPOSIT' | 'WITHDRAWAL';
  /** Intent status */
  status: 'pending' | 'filled' | 'expired' | 'cancelled';
  /** User who created the intent */
  user: string;
  /** Origin chain ID */
  originChainId: bigint;
  /** Destination chain ID */
  destinationChainId: bigint;
  /** Amount */
  amount: bigint;
  /** Creation timestamp */
  createdAt: bigint;
  /** Origin transaction hash */
  originTxHash: string;
  /** Destination transaction hash (when filled) */
  destinationTxHash?: string;
  /** Associated activity ID */
  activityId?: string;
}

/**
 * ========================================
 * SERIALIZED TYPES (for API responses)
 * ========================================
 */

/**
 * Serialized Activity (BigInt -> string)
 */
export interface SerializedActivity {
  id: string;
  type: ActivityType;
  aspStatus: ASPStatus;
  poolId: string;
  user: string;
  recipient?: string;
  amount: string | null;
  originalAmount?: string;
  vettingFeeAmount?: string;
  commitment: string;
  label?: string | null;
  precommitmentHash?: string;
  spentNullifier?: string;
  newCommitment?: string;
  refundCommitment?: string;
  feeAmount?: string;
  feeRefund?: string;
  relayer?: string;
  isSponsored?: boolean;
  isRefunded?: boolean;
  orderId?: string;
  blockNumber: string;
  timestamp: string;
  originTransactionHash: string;
  destinationTransactionHash?: string;
  originChainId: string;
  destinationChainId?: string;
}

/**
 * Serialized Pool (BigInt -> string)
 */
export interface SerializedPool {
  id: string;
  totalDeposits: string;
  totalWithdrawals: string;
  depositCount: string;
  createdAt: string;
}

/**
 * Serialized StateTreeLeaf (BigInt -> string)
 */
export interface SerializedStateTreeLeaf {
  leafIndex: string;
  leafValue: string;
  treeRoot: string;
  treeSize: string;
  poolId: string;
}

/**
 * Serialized ASPApprovalList (BigInt -> string)
 */
export interface SerializedASPApprovalList {
  id: string;
  root: string;
  ipfsCID: string;
  timestamp: string;
}

/**
 * Serialized CrossChainIntent (BigInt -> string)
 */
export interface SerializedCrossChainIntent {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  status: 'pending' | 'filled' | 'expired' | 'cancelled';
  user: string;
  originChainId: string;
  destinationChainId: string;
  amount: string;
  createdAt: string;
  originTxHash: string;
  destinationTxHash?: string;
  activityId?: string;
}

/**
 * ========================================
 * TYPED ACTIVITY VARIANTS
 * ========================================
 */

/**
 * Deposit Activity - has deposit-specific fields guaranteed
 */
export interface DepositActivity extends Omit<Activity, 'type'> {
  type: 'DEPOSIT';

  // Guaranteed deposit fields
  precommitmentHash: string;

  // Optional (when activated)
  label?: string | null;

  // Withdrawal fields are undefined
  spentNullifier?: undefined;
  newCommitment?: undefined;
  recipient?: undefined;
}

/**
 * Withdrawal Activity - has withdrawal-specific fields guaranteed
 */
export interface WithdrawalActivity extends Omit<Activity, 'type'> {
  type: 'WITHDRAWAL';

  // Guaranteed withdrawal fields
  spentNullifier: string;
  recipient: string;

  // Optional change note
  newCommitment?: string;
  refundCommitment?: string;

  // Deposit fields are undefined
  precommitmentHash?: undefined;
  label?: undefined;
}

/**
 * Cross-chain Deposit Activity
 */
export interface CrossChainDepositActivity extends Omit<Activity, 'type'> {
  type: 'CROSSCHAIN_DEPOSIT';

  // Guaranteed fields
  precommitmentHash: string;
  orderId: string;
  destinationChainId: bigint;

  // Optional (when filled by solver)
  label?: string | null;
  amount: bigint | null;
  destinationTransactionHash?: string;
}

/**
 * Cross-chain Withdrawal Activity
 */
export interface CrossChainWithdrawalActivity extends Omit<Activity, 'type'> {
  type: 'CROSSCHAIN_WITHDRAWAL';

  // Guaranteed fields
  spentNullifier: string;
  orderId: string;
  recipient: string;
  destinationChainId: bigint;

  // Optional
  newCommitment?: string;
  refundCommitment?: string;
  destinationTransactionHash?: string;
}

/**
 * Union type of all specific activity types
 */
export type TypedActivity =
  | DepositActivity
  | WithdrawalActivity
  | CrossChainDepositActivity
  | CrossChainWithdrawalActivity;

/**
 * Serialized typed activities
 */
export interface SerializedDepositActivity extends Omit<DepositActivity, 'amount' | 'originalAmount' | 'vettingFeeAmount' | 'feeAmount' | 'feeRefund' | 'blockNumber' | 'timestamp' | 'originChainId' | 'destinationChainId'> {
  amount: string | null;
  originalAmount?: string;
  vettingFeeAmount?: string;
  feeAmount?: string;
  feeRefund?: string;
  blockNumber: string;
  timestamp: string;
  originChainId: string;
  destinationChainId?: string;
}

export interface SerializedWithdrawalActivity extends Omit<WithdrawalActivity, 'amount' | 'originalAmount' | 'vettingFeeAmount' | 'feeAmount' | 'feeRefund' | 'blockNumber' | 'timestamp' | 'originChainId' | 'destinationChainId'> {
  amount: string | null;
  originalAmount?: string;
  vettingFeeAmount?: string;
  feeAmount?: string;
  feeRefund?: string;
  blockNumber: string;
  timestamp: string;
  originChainId: string;
  destinationChainId?: string;
}

export interface SerializedCrossChainDepositActivity extends Omit<CrossChainDepositActivity, 'amount' | 'originalAmount' | 'vettingFeeAmount' | 'feeAmount' | 'feeRefund' | 'blockNumber' | 'timestamp' | 'originChainId' | 'destinationChainId'> {
  amount: string | null;
  originalAmount?: string;
  vettingFeeAmount?: string;
  feeAmount?: string;
  feeRefund?: string;
  blockNumber: string;
  timestamp: string;
  originChainId: string;
  destinationChainId: string;
}

export interface SerializedCrossChainWithdrawalActivity extends Omit<CrossChainWithdrawalActivity, 'amount' | 'originalAmount' | 'vettingFeeAmount' | 'feeAmount' | 'feeRefund' | 'blockNumber' | 'timestamp' | 'originChainId' | 'destinationChainId'> {
  amount: string | null;
  originalAmount?: string;
  vettingFeeAmount?: string;
  feeAmount?: string;
  feeRefund?: string;
  blockNumber: string;
  timestamp: string;
  originChainId: string;
  destinationChainId: string;
}

export type SerializedTypedActivity =
  | SerializedDepositActivity
  | SerializedWithdrawalActivity
  | SerializedCrossChainDepositActivity
  | SerializedCrossChainWithdrawalActivity;

/**
 * ========================================
 * TYPE GUARDS
 * ========================================
 */

export const isDepositActivity = (
  activity: Activity
): activity is DepositActivity => activity.type === 'DEPOSIT';

export const isWithdrawalActivity = (
  activity: Activity
): activity is WithdrawalActivity => activity.type === 'WITHDRAWAL';

export const isCrossChainDepositActivity = (
  activity: Activity
): activity is CrossChainDepositActivity => activity.type === 'CROSSCHAIN_DEPOSIT';

export const isCrossChainWithdrawalActivity = (
  activity: Activity
): activity is CrossChainWithdrawalActivity => activity.type === 'CROSSCHAIN_WITHDRAWAL';

export const isCrossChainActivity = (
  activity: Activity
): activity is CrossChainDepositActivity | CrossChainWithdrawalActivity =>
  activity.type === 'CROSSCHAIN_DEPOSIT' || activity.type === 'CROSSCHAIN_WITHDRAWAL';

/**
 * ========================================
 * FILTER TYPES
 * ========================================
 */

/**
 * Common filter combinations for Activity queries
 */
export interface ActivityFilters {
  /** Filter by activity type */
  type?: ActivityType;
  /** Filter by ASP status */
  aspStatus?: ASPStatus;
  /** Filter by user address */
  user?: string;
  /** Filter by pool ID */
  poolId?: string;
  /** Filter by origin chain */
  originChainId?: bigint;
  /** Filter by destination chain */
  destinationChainId?: bigint;
  /** Activities after timestamp */
  after?: bigint;
  /** Activities before timestamp */
  before?: bigint;
  /** Minimum amount */
  minAmount?: bigint;
  /** Only activated (has label) */
  isActivated?: boolean;
}

/**
 * Common filter combinations for Pool queries
 */
export interface PoolFilters {
  /** Minimum total deposits */
  minTotalDeposits?: bigint;
  /** Minimum deposit count */
  minDepositCount?: bigint;
}

/**
 * Common filter combinations for StateTreeLeaf queries
 */
export interface StateTreeFilters {
  /** Filter by pool ID */
  poolId?: string;
  /** Minimum leaf index */
  minLeafIndex?: bigint;
  /** Maximum leaf index */
  maxLeafIndex?: bigint;
  /** Filter by tree root */
  treeRoot?: string;
}

/**
 * ========================================
 * PAGINATION TYPES
 * ========================================
 */

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: PageInfo;
}

/**
 * ========================================
 * UTILITY TYPES
 * ========================================
 */

/**
 * Entity types for type guards
 */
export type EntityType = 'Activity' | 'Pool' | 'StateTreeLeaf' | 'ASPApprovalList' | 'CrossChainIntent';

/**
 * Type mapping for activity types to their interfaces
 */
export interface ActivityTypeMap {
  DEPOSIT: DepositActivity;
  WITHDRAWAL: WithdrawalActivity;
  CROSSCHAIN_DEPOSIT: CrossChainDepositActivity;
  CROSSCHAIN_WITHDRAWAL: CrossChainWithdrawalActivity;
}

/**
 * Type mapping for serialized activity types
 */
export interface SerializedActivityTypeMap {
  DEPOSIT: SerializedDepositActivity;
  WITHDRAWAL: SerializedWithdrawalActivity;
  CROSSCHAIN_DEPOSIT: SerializedCrossChainDepositActivity;
  CROSSCHAIN_WITHDRAWAL: SerializedCrossChainWithdrawalActivity;
}

/**
 * Health check types
 */
export interface HealthStatus {
  status: string;
}

export interface LatestIndexedBlock {
  blockNumber: string;
  timestamp: string;
}

/**
 * Error types
 */
export interface IndexerError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Client configuration
 */
export interface IndexerConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}
