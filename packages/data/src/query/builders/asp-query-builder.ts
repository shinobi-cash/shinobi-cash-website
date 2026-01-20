/**
 * Query builder for ASPApprovalList entities (AssociationSetUpdate)
 * For ASP (Approved Set of Participants) root and IPFS CID queries
 */

import type { IndexerClient } from '../../client/indexer-client.js';
import type { ASPApprovalList, SerializedASPApprovalList } from '../../types/indexer.js';
import { BaseQueryBuilder } from './base-query-builder.js';
import {
  ASPApprovalListFields,
  ASPApprovalListWhereInput,
  ASPApprovalListOrderBy,
  GraphQLVariables,
} from '../types.js';
import { serializeASPApprovalList } from '../../transformers/index.js';

/**
 * ASP Approval List Query Builder
 */
export class ASPQueryBuilder extends BaseQueryBuilder<
  ASPApprovalList,
  SerializedASPApprovalList,
  ASPApprovalListFields,
  ASPApprovalListWhereInput,
  ASPApprovalListOrderBy
> {
  constructor(private indexerClient: IndexerClient) {
    // Default to descending order by timestamp (most recent first)
    super(indexerClient, 'associationSetUpdates', 'timestamp', 'desc');
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
      this.config.skip ? 'after: $after' : '',
    ]
      .filter(Boolean)
      .join(', ');

    const queryName = `GetASPApprovalLists`;

    return `
      query ${queryName}(${variables}) {
        associationSetUpdates(${args}) {
          items {
            ${fields}
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;
  }

  protected buildVariables(): GraphQLVariables {
    const variables: GraphQLVariables = {
      limit: this.config.first || 10,
    };

    if (this.config.skip) {
      variables.after = this.config.skip.toString();
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

  protected getSerializer(): (entity: ASPApprovalList) => SerializedASPApprovalList {
    return serializeASPApprovalList;
  }

  private getVariableDeclarations(): string {
    const declarations = ['$limit: Int!'];

    if (this.config.skip) {
      declarations.push('$after: String');
    }

    if (this.config.where) {
      this.addVariableDeclarations(this.config.where, declarations);
    }

    return declarations.join(', ');
  }

  private addVariableDeclarations(where: Partial<ASPApprovalListWhereInput>, declarations: string[]): void {
    for (const [key] of Object.entries(where)) {
      switch (key) {
        case 'id':
        case 'root':
        case 'ipfsCID':
          declarations.push(`$${key}: String`);
          break;
        case 'timestamp_gte':
        case 'timestamp_lte':
          declarations.push(`$${key}: String`);
          break;
      }
    }
  }

  private addWhereVariables(where: Partial<ASPApprovalListWhereInput>, variables: GraphQLVariables): void {
    for (const [key, value] of Object.entries(where)) {
      if (value !== undefined && value !== null) {
        variables[key] = value as string | number | boolean;
      }
    }
  }

  private buildWhereConditions(where: Partial<ASPApprovalListWhereInput>): string[] {
    const conditions: string[] = [];

    for (const [key] of Object.entries(where)) {
      conditions.push(`${key}: $${key}`);
    }

    return conditions;
  }

  protected getDefaultFields(): string {
    return `
      id
      root
      ipfsCID
      timestamp
    `;
  }

  /**
   * ========================================
   * FILTERING METHODS
   * ========================================
   */

  /**
   * Filter by ASP root hash
   */
  byRoot(root: string): this {
    this.where({ root: root });
    return this;
  }

  /**
   * Filter by IPFS CID
   */
  byIPFSCID(ipfsCID: string): this {
    this.where({ ipfsCID: ipfsCID });
    return this;
  }

  /**
   * Filter by ID
   */
  byId(id: string): this {
    this.where({ id: id });
    return this;
  }

  /**
   * Filter approvals after timestamp
   */
  afterTimestamp(timestamp: string | number): this {
    this.where({ timestamp_gte: timestamp.toString() });
    return this;
  }

  /**
   * Filter approvals before timestamp
   */
  beforeTimestamp(timestamp: string | number): this {
    this.where({ timestamp_lte: timestamp.toString() });
    return this;
  }

  /**
   * Filter approvals within a time range
   */
  betweenTimestamps(startTimestamp: string | number, endTimestamp: string | number): this {
    this.afterTimestamp(startTimestamp);
    this.beforeTimestamp(endTimestamp);
    return this;
  }

  /**
   * ========================================
   * ORDERING METHODS
   * ========================================
   */

  /**
   * Order by timestamp (most recent first by default)
   */
  orderByTimestamp(direction: 'asc' | 'desc' = 'desc'): this {
    this.orderBy('timestamp', direction);
    return this;
  }

  /**
   * ========================================
   * CONVENIENCE METHODS
   * ========================================
   */

  /**
   * Get the latest ASP approval list
   * Returns the most recent approval root and IPFS CID
   */
  async latest(): Promise<ASPApprovalList | null> {
    this.orderByTimestamp('desc');
    this.limit(1);

    return this.first();
  }

  /**
   * Get the latest ASP approval list (serialized)
   */
  async latestSerialized(): Promise<SerializedASPApprovalList | null> {
    this.orderByTimestamp('desc');
    this.limit(1);

    return this.firstSerialized();
  }
}
