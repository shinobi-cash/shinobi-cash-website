/**
 * Core query builder types and interfaces for Shinobi Cash indexer
 *
 * Supports queries for:
 * - Activity (unified timeline of deposits, withdrawals, cross-chain)
 * - Pool (privacy pool stats and configuration)
 * - StateTreeLeaf (merkle tree commitments)
 * - ASPApprovalList (association set updates)
 * - CrossChainIntent (cross-chain intent tracking)
 */

/**
 * Valid value types for GraphQL query variables
 * Used instead of `any` for type-safe variable building
 */
export type GraphQLVariableValue = string | number | boolean | null | undefined;

/**
 * Type for GraphQL query variables object
 */
export type GraphQLVariables = Record<string, GraphQLVariableValue>;

import type {
  Activity,
  Pool,
  StateTreeLeaf,
  ASPApprovalList,
  CrossChainIntent,
  ActivityType,
  ASPStatus,
} from '../types/indexer.js';

/**
 * Base query configuration for GraphQL queries
 */
export interface QueryConfig<TWhereInput, TOrderBy> {
  /** Number of items to fetch */
  first?: number;
  /** Number of items to skip (for pagination) */
  skip?: number;
  /** Field to order by */
  orderBy?: TOrderBy;
  /** Order direction */
  orderDirection?: 'asc' | 'desc';
  /** Where conditions */
  where?: Partial<TWhereInput>;
  /** For dynamic field selection */
  selectedFields?: string[];
}

/**
 * ========================================
 * FIELD TYPE DEFINITIONS
 * ========================================
 */

/**
 * Available fields for Activity entity queries
 */
export type ActivityFields =
  | keyof Activity
  | 'id type aspStatus poolId user timestamp'
  | 'commitment label precommitmentHash'
  | 'amount feeAmount relayer'
  | 'spentNullifier newCommitment refundCommitment'
  | 'orderId originChainId destinationChainId';

/**
 * Available fields for Pool entity queries
 */
export type PoolFields =
  | keyof Pool
  | 'id totalDeposits totalWithdrawals depositCount createdAt';

/**
 * Available fields for StateTreeLeaf entity queries
 */
export type StateTreeFields =
  | keyof StateTreeLeaf
  | 'leafIndex leafValue treeRoot treeSize poolId';

/**
 * Available fields for ASPApprovalList entity queries
 */
export type ASPApprovalListFields =
  | keyof ASPApprovalList
  | 'id root ipfsCID timestamp';

/**
 * Available fields for CrossChainIntent entity queries
 */
export type CrossChainIntentFields =
  | keyof CrossChainIntent
  | 'id type status user originChainId destinationChainId amount';

/**
 * ========================================
 * ORDER BY TYPES
 * ========================================
 */

/**
 * Available order by fields for Activity
 */
export type ActivityOrderBy =
  | 'id'
  | 'type'
  | 'aspStatus'
  | 'timestamp'
  | 'blockNumber'
  | 'amount'
  | 'user'
  | 'poolId';

/**
 * Available order by fields for Pool
 */
export type PoolOrderBy =
  | 'id'
  | 'totalDeposits'
  | 'totalWithdrawals'
  | 'depositCount'
  | 'createdAt';

/**
 * Available order by fields for StateTreeLeaf
 */
export type StateTreeOrderBy = 'leafIndex' | 'treeSize' | 'poolId';

/**
 * Available order by fields for ASPApprovalList
 */
export type ASPApprovalListOrderBy = 'id' | 'timestamp' | 'root';

/**
 * Available order by fields for CrossChainIntent
 */
export type CrossChainIntentOrderBy =
  | 'id'
  | 'type'
  | 'status'
  | 'createdAt'
  | 'amount'
  | 'user';

/**
 * ========================================
 * WHERE CONDITION TYPES
 * ========================================
 */

/**
 * Typed where conditions for Activity entity
 */
export interface ActivityWhereInput {
  id?: string;
  type?: ActivityType;
  aspStatus?: ASPStatus;
  poolId?: string;
  user?: string;
  recipient?: string;

  // Commitment filtering
  commitment?: string;
  label?: string;
  precommitmentHash?: string;
  spentNullifier?: string;
  newCommitment?: string;

  // Amount filtering
  amount_gte?: string; // BigInt as string
  amount_lte?: string;
  amount_gt?: string;
  amount_lt?: string;

  // Cross-chain filtering
  orderId?: string;
  originChainId?: string;
  destinationChainId?: string;

  // Time filtering
  blockNumber_gte?: string;
  blockNumber_lte?: string;
  timestamp_gte?: string;
  timestamp_lte?: string;

  // Boolean filters
  isSponsored?: boolean;
  isRefunded?: boolean;

  // Label existence (for activation check)
  label_not?: null; // Has label (is activated)
  label_is?: null; // No label (not activated)
}

/**
 * Typed where conditions for Pool entity
 */
export interface PoolWhereInput {
  id?: string;

  // Financial filtering
  totalDeposits_gte?: string;
  totalDeposits_lte?: string;
  totalWithdrawals_gte?: string;
  totalWithdrawals_lte?: string;

  // Count filtering
  depositCount_gte?: string;
  depositCount_lte?: string;
  depositCount_gt?: string;

  // Time filtering
  createdAt_gte?: string;
  createdAt_lte?: string;
}

/**
 * Typed where conditions for StateTreeLeaf entity
 */
export interface StateTreeLeafWhereInput {
  poolId?: string;
  leafIndex?: string;
  leafIndex_gte?: string;
  leafIndex_lte?: string;
  leafIndex_gt?: string;
  leafIndex_lt?: string;

  leafValue?: string;
  treeRoot?: string;

  treeSize_gte?: string;
  treeSize_lte?: string;
}

/**
 * Typed where conditions for ASPApprovalList entity
 */
export interface ASPApprovalListWhereInput {
  id?: string;
  root?: string;
  ipfsCID?: string;

  timestamp_gte?: string;
  timestamp_lte?: string;
}

/**
 * Typed where conditions for CrossChainIntent entity
 */
export interface CrossChainIntentWhereInput {
  id?: string;
  type?: 'DEPOSIT' | 'WITHDRAWAL';
  status?: 'pending' | 'filled' | 'expired' | 'cancelled';
  user?: string;

  originChainId?: string;
  destinationChainId?: string;

  amount_gte?: string;
  amount_lte?: string;

  createdAt_gte?: string;
  createdAt_lte?: string;

  activityId?: string;
}

/**
 * ========================================
 * QUERY CONFIGURATION TYPES
 * ========================================
 */

/**
 * Activity query configuration
 */
export type ActivityQuery = QueryConfig<ActivityWhereInput, ActivityOrderBy>;

/**
 * Pool query configuration
 */
export type PoolQuery = QueryConfig<PoolWhereInput, PoolOrderBy>;

/**
 * StateTreeLeaf query configuration
 */
export type StateTreeQuery = QueryConfig<StateTreeLeafWhereInput, StateTreeOrderBy>;

/**
 * ASPApprovalList query configuration
 */
export type ASPApprovalListQuery = QueryConfig<ASPApprovalListWhereInput, ASPApprovalListOrderBy>;

/**
 * CrossChainIntent query configuration
 */
export type CrossChainIntentQuery = QueryConfig<CrossChainIntentWhereInput, CrossChainIntentOrderBy>;

/**
 * ========================================
 * CONVENIENCE FILTER TYPES
 * ========================================
 */

/**
 * Common filter combinations for Activity
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
  /** Activities after timestamp */
  after?: string;
  /** Activities before timestamp */
  before?: string;
  /** Minimum amount */
  minAmount?: string;
  /** Only activated deposits */
  isActivated?: boolean;
  /** Filter by origin chain */
  originChainId?: string;
  /** Filter by destination chain */
  destinationChainId?: string;
}

/**
 * Common filter combinations for Pool
 */
export interface PoolFilters {
  /** Minimum total deposits */
  minTotalDeposits?: string;
  /** Minimum deposit count */
  minDepositCount?: string;
}

/**
 * Common filter combinations for StateTreeLeaf
 */
export interface StateTreeFilters {
  /** Filter by pool ID */
  poolId?: string;
  /** Minimum leaf index */
  minLeafIndex?: string;
  /** Maximum leaf index */
  maxLeafIndex?: string;
  /** Filter by tree root */
  treeRoot?: string;
}

/**
 * ========================================
 * HELPER TYPES FOR DYNAMIC QUERIES
 * ========================================
 */

/**
 * Entity types for dynamic query building
 */
export type EntityType = 'activity' | 'pool' | 'stateTreeLeaf' | 'aspApprovalList' | 'crossChainIntent';

/**
 * All where input types
 */
export type AllWhereInputs =
  | ActivityWhereInput
  | PoolWhereInput
  | StateTreeLeafWhereInput
  | ASPApprovalListWhereInput
  | CrossChainIntentWhereInput;

/**
 * All order by types
 */
export type AllOrderByTypes =
  | ActivityOrderBy
  | PoolOrderBy
  | StateTreeOrderBy
  | ASPApprovalListOrderBy
  | CrossChainIntentOrderBy;

/**
 * All field types
 */
export type AllFieldTypes =
  | ActivityFields
  | PoolFields
  | StateTreeFields
  | ASPApprovalListFields
  | CrossChainIntentFields;
