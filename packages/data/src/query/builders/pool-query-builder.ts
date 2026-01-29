/**
 * Query builder for Pool entities
 * For privacy pool statistics and configuration
 */

import type { IndexerClient } from '../../client/indexer-client.js';
import type { Pool, SerializedPool, CrosschainChainStats } from '../../types/indexer.js';
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

    // Query all pool stats views
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
            uniqueDepositors
          }
        }
        withdrawalStatsViews(where: { poolId: $poolId }, limit: 1) {
          items {
            withdrawalCount
            totalWithdrawn
          }
        }
        crosschainDepositStatsViews(limit: 100) {
          items {
            originChainId
            depositCount
            totalDeposited
          }
        }
        crosschainWithdrawalStatsViews(limit: 100) {
          items {
            destinationChainId
            withdrawalCount
            totalWithdrawn
          }
        }
        ragequitStatsViews(where: { poolId: $poolId }, limit: 1) {
          items {
            ragequitCount
            totalRagequitAmount
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
   * Override execute to combine all pool stats views
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
      uniqueDepositors: string;
    }

    interface WithdrawalStatsItem {
      withdrawalCount: string;
      totalWithdrawn: string;
    }

    interface CrosschainDepositStatsItem {
      originChainId: string;
      depositCount: string;
      totalDeposited: string;
    }

    interface CrosschainWithdrawalStatsItem {
      destinationChainId: string;
      withdrawalCount: string;
      totalWithdrawn: string;
    }

    interface RagequitStatsItem {
      ragequitCount: string;
      totalRagequitAmount: string;
    }

    const result = await this.client.executeQuery<{
      poolConfigViews: { items: PoolConfigItem[] };
      poolStatsViews: { items: PoolStatsItem[] };
      withdrawalStatsViews: { items: WithdrawalStatsItem[] };
      crosschainDepositStatsViews: { items: CrosschainDepositStatsItem[] };
      crosschainWithdrawalStatsViews: { items: CrosschainWithdrawalStatsItem[] };
      ragequitStatsViews: { items: RagequitStatsItem[] };
    }>(query, variables);

    const config = result.poolConfigViews?.items?.[0];
    const depositStats = result.poolStatsViews?.items?.[0];
    const withdrawalStats = result.withdrawalStatsViews?.items?.[0];
    const crosschainDepositItems = result.crosschainDepositStatsViews?.items ?? [];
    const crosschainWithdrawalItems = result.crosschainWithdrawalStatsViews?.items ?? [];
    const ragequitStats = result.ragequitStatsViews?.items?.[0];

    if (!config) {
      return [];
    }

    // Build crosschain deposit stats map by origin chainId
    const crosschainDepositsByChain: Record<string, CrosschainChainStats> = {};
    for (const item of crosschainDepositItems) {
      crosschainDepositsByChain[item.originChainId] = {
        count: BigInt(item.depositCount),
        totalAmount: BigInt(item.totalDeposited),
      };
    }

    // Build crosschain withdrawal stats map by destination chainId
    const crosschainWithdrawalsByChain: Record<string, CrosschainChainStats> = {};
    for (const item of crosschainWithdrawalItems) {
      crosschainWithdrawalsByChain[item.destinationChainId] = {
        count: BigInt(item.withdrawalCount),
        totalAmount: BigInt(item.totalWithdrawn),
      };
    }

    // Combine all stats into Pool entity
    const pool: Pool = {
      id: config.poolAddress,
      createdAt: BigInt(config.timestamp),
      totalDeposits: depositStats?.totalDeposited ? BigInt(depositStats.totalDeposited) : BigInt(0),
      totalWithdrawals: withdrawalStats?.totalWithdrawn ? BigInt(withdrawalStats.totalWithdrawn) : BigInt(0),
      depositCount: depositStats?.depositCount ? BigInt(depositStats.depositCount) : BigInt(0),
      withdrawalCount: withdrawalStats?.withdrawalCount ? BigInt(withdrawalStats.withdrawalCount) : BigInt(0),
      uniqueDepositors: depositStats?.uniqueDepositors ? BigInt(depositStats.uniqueDepositors) : BigInt(0),
      crosschainDepositsByChain,
      crosschainWithdrawalsByChain,
      ragequitCount: ragequitStats?.ragequitCount ? BigInt(ragequitStats.ragequitCount) : BigInt(0),
      totalRagequitAmount: ragequitStats?.totalRagequitAmount ? BigInt(ragequitStats.totalRagequitAmount) : BigInt(0),
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
