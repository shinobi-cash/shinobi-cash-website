/**
 * Query builder for StateTreeLeaf entities (MerkleTreeLeaf)
 * For merkle tree commitments used in ZK proof generation
 */

import type { IndexerClient } from '../../client/indexer-client.js';
import type { StateTreeLeaf, SerializedStateTreeLeaf } from '../../types/indexer.js';
import { BaseQueryBuilder } from './base-query-builder.js';
import { StateTreeFields, StateTreeLeafWhereInput, StateTreeOrderBy, GraphQLVariables } from '../types.js';
import { serializeStateTreeLeaf } from '../../transformers/index.js';

/**
 * StateTree Query Builder
 */
export class StateTreeQueryBuilder extends BaseQueryBuilder<
  StateTreeLeaf,
  SerializedStateTreeLeaf,
  StateTreeFields,
  StateTreeLeafWhereInput,
  StateTreeOrderBy
> {
  constructor(private indexerClient: IndexerClient) {
    // Default to ascending order by leafIndex for merkle tree construction
    super(indexerClient, 'merkleTreeLeafs', 'leafIndex', 'asc');
  }

  protected buildDynamicQuery(): string {
    const fields = this.config.selectedFields?.join('\n        ') || this.getDefaultFields();
    const variables = this.getVariableDeclarations();
    const whereClause = this.buildWhereClauseString();
    const orderByClause = this.config.orderBy ? `orderBy: "${this.config.orderBy}"` : '';
    const orderDirectionClause = this.config.orderDirection
      ? `orderDirection: "${this.config.orderDirection}"`
      : '';

    const args = [
      whereClause,
      orderByClause,
      orderDirectionClause,
      'limit: $limit',
      this.config.skip !== undefined ? 'offset: $offset' : '',
    ]
      .filter(Boolean)
      .join(', ');

    const queryName = `GetMerkleTreeLeaves`;

    return `
      query ${queryName}(${variables}) {
        merkleTreeLeafs(${args}) {
          items {
            ${fields}
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `;
  }

  protected buildVariables(): GraphQLVariables {
    const variables: GraphQLVariables = {
      limit: this.config.first || 1000, // Higher default for tree construction
    };

    if (this.config.skip !== undefined) {
      variables.offset = this.config.skip;
    }

    if (this.config.where) {
      this.addWhereVariables(this.config.where, variables);
    }

    return variables;
  }

  protected buildWhereClauseString(): string {
    if (!this.config.where || Object.keys(this.config.where).length === 0) {
      return '';
    }

    const conditions = this.buildWhereConditions(this.config.where);
    return conditions.length > 0 ? `where: { ${conditions.join(', ')} }` : '';
  }

  protected getSerializer(): (entity: StateTreeLeaf) => SerializedStateTreeLeaf {
    return serializeStateTreeLeaf;
  }

  private getVariableDeclarations(): string {
    const declarations = ['$limit: Int!'];

    if (this.config.skip !== undefined) {
      declarations.push('$offset: Int');
    }

    if (this.config.where) {
      this.addVariableDeclarations(this.config.where, declarations);
    }

    return declarations.join(', ');
  }

  private addVariableDeclarations(where: Partial<StateTreeLeafWhereInput>, declarations: string[]): void {
    for (const [key] of Object.entries(where)) {
      switch (key) {
        case 'poolId':
        case 'leafIndex':
        case 'leafValue':
        case 'treeRoot':
          declarations.push(`$${key}: String`);
          break;
        case 'leafIndex_gte':
        case 'leafIndex_lte':
        case 'leafIndex_gt':
        case 'leafIndex_lt':
        case 'treeSize_gte':
        case 'treeSize_lte':
          declarations.push(`$${key}: String`);
          break;
      }
    }
  }

  private addWhereVariables(where: Partial<StateTreeLeafWhereInput>, variables: GraphQLVariables): void {
    for (const [key, value] of Object.entries(where)) {
      if (value !== undefined && value !== null) {
        variables[key] = value as string | number | boolean;
      }
    }
  }

  private buildWhereConditions(where: Partial<StateTreeLeafWhereInput>): string[] {
    const conditions: string[] = [];

    for (const [key] of Object.entries(where)) {
      conditions.push(`${key}: $${key}`);
    }

    return conditions;
  }

  protected getDefaultFields(): string {
    return `
      leafIndex
      leafValue
      treeRoot
      treeSize
      poolId
    `;
  }

  /**
   * ========================================
   * FILTERING METHODS
   * ========================================
   */

  /**
   * Filter by pool ID (required for most queries)
   */
  byPool(poolId: string): this {
    this.where({ poolId: poolId.toLowerCase() });
    return this;
  }

  /**
   * Filter by specific leaf index
   */
  byLeafIndex(index: string | number): this {
    this.where({ leafIndex: index.toString() });
    return this;
  }

  /**
   * Filter by leaf value (commitment)
   */
  byLeafValue(value: string): this {
    this.where({ leafValue: value });
    return this;
  }

  /**
   * Filter by tree root
   */
  byTreeRoot(root: string): this {
    this.where({ treeRoot: root });
    return this;
  }

  /**
   * Filter leaves in index range (inclusive)
   */
  inIndexRange(startIndex: string | number, endIndex: string | number): this {
    this.where({
      leafIndex_gte: startIndex.toString(),
      leafIndex_lte: endIndex.toString(),
    });
    return this;
  }

  /**
   * Filter leaves with minimum index
   */
  fromIndex(index: string | number): this {
    this.where({ leafIndex_gte: index.toString() });
    return this;
  }

  /**
   * Filter leaves up to maximum index
   */
  toIndex(index: string | number): this {
    this.where({ leafIndex_lte: index.toString() });
    return this;
  }

  /**
   * Filter by minimum tree size
   */
  withMinTreeSize(size: string | number): this {
    this.where({ treeSize_gte: size.toString() });
    return this;
  }

  /**
   * ========================================
   * ORDERING METHODS
   * ========================================
   */

  /**
   * Order by leaf index (ascending by default for tree construction)
   */
  orderByLeafIndex(direction: 'asc' | 'desc' = 'asc'): this {
    this.orderBy('leafIndex', direction);
    return this;
  }

  /**
   * Order by tree size
   */
  orderByTreeSize(direction: 'asc' | 'desc' = 'desc'): this {
    this.orderBy('treeSize', direction);
    return this;
  }

  /**
   * ========================================
   * CONVENIENCE METHODS
   * ========================================
   */

  /**
   * Get all leaves for merkle tree construction
   * Automatically handles pagination to fetch all leaves
   */
  async getAllLeavesForTree(poolId: string): Promise<StateTreeLeaf[]> {
    this.byPool(poolId);
    this.orderByLeafIndex('asc');
    this.limit(1000);

    const allLeaves: StateTreeLeaf[] = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      if (offset > 0) {
        this.skip(offset);
      }

      const query = this.buildDynamicQuery();
      const variables = this.buildVariables();
      const result = await this.client.executeQuery<{
        merkleTreeLeafs: {
          items: StateTreeLeaf[];
          pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
        };
      }>(query, variables);

      const { items, pageInfo } = result.merkleTreeLeafs;
      allLeaves.push(...items);

      hasMore = pageInfo.hasNextPage;
      offset += items.length;
    }

    return allLeaves;
  }
}
