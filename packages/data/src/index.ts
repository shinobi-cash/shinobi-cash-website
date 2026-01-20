/**
 * @shinobi-cash/data - Shinobi Cash indexer data access layer
 *
 * This package handles all indexer interactions and data transformations
 * for the Shinobi Cash privacy pool system.
 *
 * Provides type-safe, fluent API for querying:
 * - Activities (deposits, withdrawals, cross-chain intents)
 * - Pools (privacy pool statistics)
 * - State Tree (merkle tree commitments for ZK proofs)
 * - ASP Approvals (association set of participants)
 */

/**
 * ========================================
 * CORE TYPES
 * ========================================
 */

// Main entity types
export type {
  Activity,
  Pool,
  StateTreeLeaf,
  ASPApprovalList,
  CrossChainIntent,
  ActivityType,
  ASPStatus,
  EntityType,
} from './types/indexer.js';

// Serialized type definitions (BigInt -> string)
export type {
  SerializedActivity,
  SerializedPool,
  SerializedStateTreeLeaf,
  SerializedASPApprovalList,
  SerializedCrossChainIntent,
} from './types/indexer.js';

// Typed activity variants
export type {
  DepositActivity,
  WithdrawalActivity,
  CrossChainDepositActivity,
  CrossChainWithdrawalActivity,
  TypedActivity,
  SerializedDepositActivity,
  SerializedWithdrawalActivity,
  SerializedCrossChainDepositActivity,
  SerializedCrossChainWithdrawalActivity,
  SerializedTypedActivity,
} from './types/indexer.js';

// Type guards
export {
  isDepositActivity,
  isWithdrawalActivity,
  isCrossChainDepositActivity,
  isCrossChainWithdrawalActivity,
  isCrossChainActivity,
} from './types/indexer.js';

// Filter types
export type {
  ActivityFilters,
  PoolFilters,
  StateTreeFilters,
  PageInfo,
  PaginatedResponse,
  HealthStatus,
  LatestIndexedBlock,
  IndexerError,
  IndexerConfig,
} from './types/indexer.js';

// Type maps
export type {
  ActivityTypeMap,
  SerializedActivityTypeMap,
} from './types/indexer.js';

/**
 * ========================================
 * CLIENT
 * ========================================
 */

export { IndexerClient, setShinobiClient, getShinobiClient, hasShinobiClient } from './client/indexer-client.js';
export type { IndexerClientOptions, PaginationOptions } from './client/indexer-client.js';

/**
 * ========================================
 * QUERY BUILDER API
 * ========================================
 */

// Main query builder class
export { QueryBuilder } from './query/query-builder.js';

// Entity-specific query builders
export { ActivityQueryBuilder } from './query/builders/activity-query-builder.js';
export { PoolQueryBuilder } from './query/builders/pool-query-builder.js';
export { StateTreeQueryBuilder } from './query/builders/state-tree-query-builder.js';
export { ASPQueryBuilder } from './query/builders/asp-query-builder.js';
export { BaseQueryBuilder } from './query/builders/base-query-builder.js';

// Typed query builder factories
export {
  createDepositActivityQueryBuilder,
  createWithdrawalActivityQueryBuilder,
  createCrossChainDepositActivityQueryBuilder,
  createCrossChainWithdrawalActivityQueryBuilder,
} from './query/builders/activity-query-builder.js';

// Query configuration types
export type {
  QueryConfig,
  ActivityFields,
  PoolFields,
  StateTreeFields,
  ASPApprovalListFields,
  CrossChainIntentFields,
  ActivityOrderBy,
  PoolOrderBy,
  StateTreeOrderBy,
  ASPApprovalListOrderBy,
  CrossChainIntentOrderBy,
  ActivityWhereInput,
  PoolWhereInput,
  StateTreeLeafWhereInput,
  ASPApprovalListWhereInput,
  CrossChainIntentWhereInput,
  ActivityQuery,
  PoolQuery,
  StateTreeQuery,
  ASPApprovalListQuery,
  CrossChainIntentQuery,
} from './query/types.js';

/**
 * ========================================
 * TRANSFORMERS
 * ========================================
 */

// Utility functions
export { safeBigIntParse, convertBigIntsToStrings, convertStringsToBigInts } from './transformers/index.js';

// Serialization functions
export {
  serializeActivity,
  serializePool,
  serializeStateTreeLeaf,
  serializeASPApprovalList,
  serializeCrossChainIntent,
  serializeActivities,
} from './transformers/index.js';

// Deserialization functions
export {
  deserializeActivity,
  deserializePool,
  deserializeStateTreeLeaf,
  deserializeASPApprovalList,
  deserializeCrossChainIntent,
  deserializeActivities,
} from './transformers/index.js';

// Convenience exports
export { serializers, deserializers } from './transformers/index.js';

/**
 * ========================================
 * PACKAGE VERSION
 * ========================================
 */

export const VERSION = '1.0.0';
