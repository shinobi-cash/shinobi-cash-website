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
    const fields = this.config.selectedFields?.join('\n      ') || this.getDefaultFields();
    const id = this.config.where?.id;

    if (!id) {
      throw new Error('Pool queries require an id. Use .byId(poolId) to specify the pool.');
    }

    const queryName = `GetPool`;

    return `
      query ${queryName}($id: String!) {
        pools(where: { id: $id }, limit: 1) {
          items {
            ${fields}
          }
        }
      }
    `;
  }

  protected buildVariables(): GraphQLVariables {
    const variables: GraphQLVariables = {};

    if (this.config.where?.id) {
      variables.id = this.config.where.id;
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
   * Override execute to handle Ponder pagination response
   */
  async execute(): Promise<Pool[]> {
    const query = this.buildDynamicQuery();
    const variables = this.buildVariables();
    const result = await this.client.executeQuery<{ pools: { items: Pool[] } }>(query, variables);

    // Return items array from Ponder pagination response
    return result.pools?.items ?? [];
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
