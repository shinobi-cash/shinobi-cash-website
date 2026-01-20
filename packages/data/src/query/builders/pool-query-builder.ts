/**
 * Query builder for Pool entities
 * For privacy pool statistics and configuration
 */

import type { IndexerClient } from '../../client/indexer-client.js';
import type { Pool, SerializedPool } from '../../types/indexer.js';
import { BaseQueryBuilder } from './base-query-builder.js';
import { PoolFields, PoolWhereInput, PoolOrderBy, GraphQLVariables } from '../types.js';
import { serializePool } from '../../transformers/index.js';

/**
 * Pool Query Builder
 */
export class PoolQueryBuilder extends BaseQueryBuilder<
  Pool,
  SerializedPool,
  PoolFields,
  PoolWhereInput,
  PoolOrderBy
> {
  constructor(private indexerClient: IndexerClient) {
    super(indexerClient, 'pool', 'createdAt', 'desc');
  }

  protected buildDynamicQuery(): string {
    const id = this.config.where?.id;

    if (!id) {
      throw new Error('Pool queries require an id. Use .byId(poolId) to specify the pool.');
    }

    // Query both poolConfigViews and poolStatsViews to get full pool data
    return `
      query GetPool($poolAddress: String!, $poolId: String!) {
        poolConfigViews(where: { poolAddress: $poolAddress }, limit: 1) {
          items {
            poolAddress
            chainId
            asset
            scope
            timestamp
          }
        }
        poolStatsViews(where: { poolId: $poolId }, limit: 1) {
          items {
            depositCount
            totalDeposited
          }
        }
      }
    `;
  }

  protected buildVariables(): GraphQLVariables {
    const variables: GraphQLVariables = {};

    if (this.config.where?.id) {
      // Both views need the pool address/id
      variables.poolAddress = this.config.where.id;
      variables.poolId = this.config.where.id;
    }

    return variables;
  }

  protected buildWhereClauseString(): string {
    // Not used for pool queries (single entity by ID)
    return '';
  }

  protected getSerializer(): (entity: Pool) => SerializedPool {
    return serializePool;
  }

  protected getDefaultFields(): string {
    return `
      id
      totalDeposits
      totalWithdrawals
      depositCount
      createdAt
    `;
  }

  /**
   * Override execute to combine poolConfigViews and poolStatsViews
   */
  async execute(): Promise<Pool[]> {
    const query = this.buildDynamicQuery();
    const variables = this.buildVariables();

    interface PoolConfigItem {
      poolAddress: string;
      timestamp: string;
    }

    interface PoolStatsItem {
      depositCount: string;
      totalDeposited: string;
    }

    const result = await this.client.executeQuery<{
      poolConfigViews: { items: PoolConfigItem[] };
      poolStatsViews: { items: PoolStatsItem[] };
    }>(query, variables);

    const config = result.poolConfigViews?.items?.[0];
    const stats = result.poolStatsViews?.items?.[0];

    if (!config) {
      return [];
    }

    // Combine config and stats into Pool entity
    const pool: Pool = {
      id: config.poolAddress,
      createdAt: BigInt(config.timestamp),
      totalDeposits: stats?.totalDeposited ? BigInt(stats.totalDeposited) : BigInt(0),
      totalWithdrawals: BigInt(0), // Not tracked in current views
      depositCount: stats?.depositCount ? BigInt(stats.depositCount) : BigInt(0),
    };

    return [pool];
  }

  /**
   * ========================================
   * FILTERING METHODS
   * ========================================
   */

  /**
   * Filter by pool ID (required for pool queries)
   */
  byId(poolId: string): this {
    this.where({ id: poolId.toLowerCase() });
    return this;
  }

  /**
   * Filter pools with minimum total deposits
   */
  withMinTotalDeposits(amount: string | number): this {
    this.where({ totalDeposits_gte: amount.toString() });
    return this;
  }

  /**
   * Filter pools with maximum total deposits
   */
  withMaxTotalDeposits(amount: string | number): this {
    this.where({ totalDeposits_lte: amount.toString() });
    return this;
  }

  /**
   * Filter pools with minimum deposit count
   */
  withMinDepositCount(count: string | number): this {
    this.where({ depositCount_gte: count.toString() });
    return this;
  }

  /**
   * Filter pools created after timestamp
   */
  createdAfter(timestamp: string | number): this {
    this.where({ createdAt_gte: timestamp.toString() });
    return this;
  }

  /**
   * Filter pools created before timestamp
   */
  createdBefore(timestamp: string | number): this {
    this.where({ createdAt_lte: timestamp.toString() });
    return this;
  }

  /**
   * ========================================
   * ORDERING METHODS
   * ========================================
   */

  /**
   * Order by total deposits
   */
  orderByTotalDeposits(direction: 'asc' | 'desc' = 'desc'): this {
    this.orderBy('totalDeposits', direction);
    return this;
  }

  /**
   * Order by deposit count
   */
  orderByDepositCount(direction: 'asc' | 'desc' = 'desc'): this {
    this.orderBy('depositCount', direction);
    return this;
  }

  /**
   * Order by created timestamp
   */
  orderByCreated(direction: 'asc' | 'desc' = 'desc'): this {
    this.orderBy('createdAt', direction);
    return this;
  }
}
