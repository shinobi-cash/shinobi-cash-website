/**
 * Main Query Builder
 * Factory for creating entity-specific query builders
 */

import type { IndexerClient } from '../client/indexer-client.js';
import { ActivityQueryBuilder } from './builders/activity-query-builder.js';
import { PoolQueryBuilder } from './builders/pool-query-builder.js';
import { StateTreeQueryBuilder } from './builders/state-tree-query-builder.js';
import { ASPQueryBuilder } from './builders/asp-query-builder.js';

/**
 * Main query builder providing access to all entity query builders
 *
 * This is the entry point for the fluent query API. It provides factory methods
 * for creating specialized query builders for each entity type.
 *
 * @example
 * ```typescript
 * const client = new IndexerClient({ endpoint: 'https://...' });
 * const queryBuilder = new QueryBuilder(client);
 *
 * // Query activities
 * const deposits = await queryBuilder
 *   .activities()
 *   .byPool(poolId)
 *   .onlyDeposits()
 *   .limit(50)
 *   .execute();
 *
 * // Query pool stats
 * const pool = await queryBuilder
 *   .pool()
 *   .byId(poolId)
 *   .first();
 *
 * // Query merkle tree leaves
 * const leaves = await queryBuilder
 *   .stateTree()
 *   .byPool(poolId)
 *   .orderByLeafIndex('asc')
 *   .execute();
 *
 * // Query ASP approvals
 * const latestASP = await queryBuilder
 *   .aspApprovals()
 *   .latest();
 * ```
 */
export class QueryBuilder {
  constructor(private client: IndexerClient) {}

  /**
   * Create an Activity query builder
   *
   * Query the unified timeline of privacy pool events including:
   * - Deposits (same-chain and cross-chain)
   * - Withdrawals (same-chain and cross-chain)
   * - ASP status tracking
   *
   * @returns ActivityQueryBuilder instance
   *
   * @example
   * ```typescript
   * // Get recent deposits for a user
   * const deposits = await queryBuilder
   *   .activities()
   *   .byPool(poolId)
   *   .byUser(userAddress)
   *   .onlyDeposits()
   *   .onlyActivated()
   *   .orderByTimestamp('desc')
   *   .limit(10)
   *   .executeAndSerialize();
   *
   * // Get pending cross-chain deposits
   * const pendingDeposits = await queryBuilder
   *   .activities()
   *   .byPool(poolId)
   *   .onlyCrossChainDeposits()
   *   .onlyPendingSolverFill()
   *   .execute();
   *
   * // Get withdrawals to specific recipient
   * const withdrawals = await queryBuilder
   *   .activities()
   *   .onlyWithdrawals()
   *   .byRecipient(recipientAddress)
   *   .execute();
   * ```
   */
  activities(): ActivityQueryBuilder {
    return new ActivityQueryBuilder(this.client);
  }

  /**
   * Create a Pool query builder
   *
   * Query privacy pool statistics and configuration including:
   * - Total deposits and withdrawals
   * - Deposit count
   * - Creation timestamp
   *
   * @returns PoolQueryBuilder instance
   *
   * @example
   * ```typescript
   * // Get pool stats
   * const poolStats = await queryBuilder
   *   .pool()
   *   .byId(poolId)
   *   .firstSerialized();
   *
   * // Pool data
   * console.log(poolStats.totalDeposits);
   * console.log(poolStats.depositCount);
   * ```
   */
  pool(): PoolQueryBuilder {
    return new PoolQueryBuilder(this.client);
  }

  /**
   * Create a StateTree query builder
   *
   * Query merkle tree leaves (commitments) for ZK proof generation:
   * - Leaf index and value
   * - Tree root and size
   * - Ordered for tree construction
   *
   * @returns StateTreeQueryBuilder instance
   *
   * @example
   * ```typescript
   * // Get all leaves for proof generation
   * const leaves = await queryBuilder
   *   .stateTree()
   *   .byPool(poolId)
   *   .orderByLeafIndex('asc')
   *   .limit(10000)
   *   .execute();
   *
   * // Get leaves in specific index range
   * const rangeLeaves = await queryBuilder
   *   .stateTree()
   *   .byPool(poolId)
   *   .inIndexRange(0, 100)
   *   .execute();
   *
   * // Auto-paginated tree construction
   * const allLeaves = await queryBuilder
   *   .stateTree()
   *   .getAllLeavesForTree(poolId);
   * ```
   */
  stateTree(): StateTreeQueryBuilder {
    return new StateTreeQueryBuilder(this.client);
  }

  /**
   * Create an ASP Approval query builder
   *
   * Query Association Set of Participants (ASP) approval lists:
   * - Merkle root of approved labels
   * - IPFS CID with approval list
   * - Timestamps
   *
   * @returns ASPQueryBuilder instance
   *
   * @example
   * ```typescript
   * // Get latest ASP root
   * const latestASP = await queryBuilder
   *   .aspApprovals()
   *   .latest();
   *
   * console.log(latestASP.root);
   * console.log(latestASP.ipfsCID);
   *
   * // Get ASP updates in time range
   * const recentUpdates = await queryBuilder
   *   .aspApprovals()
   *   .betweenTimestamps(startTime, endTime)
   *   .orderByTimestamp('desc')
   *   .execute();
   * ```
   */
  aspApprovals(): ASPQueryBuilder {
    return new ASPQueryBuilder(this.client);
  }
}
