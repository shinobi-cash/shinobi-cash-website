/**
 * Query builder for Intent entities
 * Queries IntentStatusView (latest phase per orderId) and IntentTimelineView
 */

import type { IndexerClient } from '../../client/indexer-client.js';
import type {
  Intent,
  SerializedIntent,
  IntentTimelineEvent,
  SerializedIntentTimelineEvent,
  IntentPhase,
  IntentType,
  PaginatedResponse,
} from '../../types/indexer.js';
import { BaseQueryBuilder } from './base-query-builder.js';
import { IntentFields, IntentWhereInput, IntentOrderBy, GraphQLVariables } from '../types.js';
import { serializeIntent, serializeIntentTimelineEvent } from '../../transformers/index.js';

/**
 * Default fields for Intent queries
 */
const DEFAULT_INTENT_FIELDS = `
  orderId
  intentType
  phase
  user
  solver
  originChainId
  destinationChainId
  amount
  fillDeadline
  expires
  nonce
  fillOracle
  intentOracle
  inputAmount
  outputAmount
  outputRecipient
  txHash
  blockNumber
  timestamp
`;

/**
 * Default fields for IntentTimeline queries
 */
const DEFAULT_TIMELINE_FIELDS = `
  id
  orderId
  phase
  intentType
  user
  solver
  amount
  originChainId
  destinationChainId
  fillDeadline
  expires
  nonce
  fillOracle
  intentOracle
  inputAmount
  outputAmount
  outputRecipient
  txHash
  blockNumber
  timestamp
`;

/**
 * Intent Query Builder
 * Provides fluent API for querying IntentStatusView
 */
export class IntentQueryBuilder extends BaseQueryBuilder<
  Intent,
  SerializedIntent,
  IntentFields,
  IntentWhereInput,
  IntentOrderBy
> {
  constructor(private indexerClient: IndexerClient) {
    super(indexerClient, 'intentStatusViews', 'timestamp', 'desc');
  }

  protected getDefaultFields(): string {
    return DEFAULT_INTENT_FIELDS;
  }

  protected getSerializer(): (entity: Intent) => SerializedIntent {
    return serializeIntent;
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

    return `
      query GetIntents(${variables}) {
        intentStatusViews(${args}) {
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
      limit: this.config.first || 100,
    };

    if (this.config.skip !== undefined) {
      variables.offset = this.config.skip;
    }

    return variables;
  }

  protected buildWhereClauseString(): string {
    if (!this.config.where || Object.keys(this.config.where).length === 0) {
      return '';
    }

    const conditions: string[] = [];
    const where = this.config.where;

    if (where.orderId) conditions.push(`orderId: "${where.orderId}"`);
    if (where.orderId_contains) conditions.push(`orderId_contains: "${where.orderId_contains}"`);
    if (where.intentType) conditions.push(`intentType: "${where.intentType}"`);
    if (where.phase) conditions.push(`phase: "${where.phase}"`);
    if (where.user) conditions.push(`user: "${where.user}"`);
    if (where.solver) conditions.push(`solver: "${where.solver}"`);
    if (where.originChainId) conditions.push(`originChainId: "${where.originChainId}"`);
    if (where.destinationChainId) conditions.push(`destinationChainId: "${where.destinationChainId}"`);

    if (conditions.length === 0) return '';
    return `where: { ${conditions.join(', ')} }`;
  }

  protected getVariableDeclarations(): string {
    const declarations = ['$limit: Int!'];
    if (this.config.skip !== undefined) {
      declarations.push('$offset: Int');
    }
    return declarations.join(', ');
  }

  // ========================================
  // FLUENT API - Intent-specific methods
  // ========================================

  /**
   * Filter by order ID (exact match)
   */
  byOrderId(orderId: string): this {
    return this.where({ orderId });
  }

  /**
   * Filter by order ID (contains/search)
   */
  searchOrderId(search: string): this {
    return this.where({ orderId_contains: search });
  }

  /**
   * Filter by intent type
   */
  byType(intentType: IntentType): this {
    return this.where({ intentType });
  }

  /**
   * Filter to only deposits
   */
  onlyDeposits(): this {
    return this.byType('DEPOSIT');
  }

  /**
   * Filter to only withdrawals
   */
  onlyWithdrawals(): this {
    return this.byType('WITHDRAWAL');
  }

  /**
   * Filter by phase
   */
  byPhase(phase: IntentPhase): this {
    return this.where({ phase });
  }

  /**
   * Filter by user address
   */
  byUser(user: string): this {
    return this.where({ user });
  }

  /**
   * Filter by solver address
   */
  bySolver(solver: string): this {
    return this.where({ solver });
  }

  /**
   * Filter by origin chain
   */
  fromChain(chainId: bigint | number): this {
    return this.where({ originChainId: chainId.toString() });
  }

  /**
   * Filter by destination chain
   */
  toChain(chainId: bigint | number): this {
    return this.where({ destinationChainId: chainId.toString() });
  }

  /**
   * Order by timestamp descending (newest first)
   */
  orderByTimestamp(direction: 'asc' | 'desc' = 'desc'): this {
    return this.orderBy('timestamp', direction);
  }

  // ========================================
  // EXECUTION - Override for paginated response
  // ========================================

  /**
   * Execute and return paginated response
   */
  async executePaginated(): Promise<PaginatedResponse<Intent>> {
    if (!this.config.first) {
      this.config.first = 100;
    }

    const query = this.buildDynamicQuery();
    const variables = this.buildVariables();

    const result = await this.indexerClient.executeQuery<{
      intentStatusViews: { items: RawIntent[]; pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean } };
    }>(query, variables);

    const items = (result.intentStatusViews?.items || []).map(convertRawIntent);

    return {
      items,
      pageInfo: result.intentStatusViews?.pageInfo || { hasNextPage: false, hasPreviousPage: false },
    };
  }

  /**
   * Execute and return paginated serialized response
   */
  async executePaginatedSerialized(): Promise<PaginatedResponse<SerializedIntent>> {
    const result = await this.executePaginated();
    return {
      items: result.items.map(serializeIntent),
      pageInfo: result.pageInfo,
    };
  }

  // ========================================
  // TIMELINE - Get full intent lifecycle
  // ========================================

  /**
   * Get intent details with full timeline
   * @param orderId - The order ID to fetch
   * @returns Intent with timeline events or null if not found
   */
  async getWithTimeline(orderId: string): Promise<{
    intent: Intent;
    timeline: IntentTimelineEvent[];
  } | null> {
    const query = `
      query GetIntentDetails($orderId: String!) {
        intentStatusViews(where: { orderId: $orderId }, limit: 1) {
          items {
            ${DEFAULT_INTENT_FIELDS}
          }
        }
        intentTimelineViews(where: { orderId: $orderId }, orderBy: "timestamp", orderDirection: "asc") {
          items {
            ${DEFAULT_TIMELINE_FIELDS}
          }
        }
      }
    `;

    const result = await this.indexerClient.executeQuery<{
      intentStatusViews: { items: RawIntent[] };
      intentTimelineViews: { items: RawTimelineEvent[] };
    }>(query, { orderId });

    const rawIntent = result.intentStatusViews?.items?.[0];
    if (!rawIntent) {
      return null;
    }

    return {
      intent: convertRawIntent(rawIntent),
      timeline: (result.intentTimelineViews?.items || []).map(convertRawTimelineEvent),
    };
  }

  /**
   * Get intent details with full timeline (serialized)
   */
  async getWithTimelineSerialized(orderId: string): Promise<{
    intent: SerializedIntent;
    timeline: SerializedIntentTimelineEvent[];
  } | null> {
    const result = await this.getWithTimeline(orderId);
    if (!result) return null;

    return {
      intent: serializeIntent(result.intent),
      timeline: result.timeline.map(serializeIntentTimelineEvent),
    };
  }
}

// ========================================
// RAW TYPES AND CONVERTERS
// ========================================

interface RawIntent {
  orderId: string;
  intentType: string;
  phase: string;
  user?: string;
  solver?: string;
  originChainId?: string;
  destinationChainId?: string;
  amount?: string;
  fillDeadline?: string;
  expires?: string;
  nonce?: string;
  fillOracle?: string;
  intentOracle?: string;
  inputAmount?: string;
  outputAmount?: string;
  outputRecipient?: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
}

interface RawTimelineEvent {
  id: string;
  orderId: string;
  phase: string;
  intentType: string;
  user?: string;
  solver?: string;
  amount?: string;
  originChainId?: string;
  destinationChainId?: string;
  fillDeadline?: string;
  expires?: string;
  nonce?: string;
  fillOracle?: string;
  intentOracle?: string;
  inputAmount?: string;
  outputAmount?: string;
  outputRecipient?: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
}

function convertRawIntent(raw: RawIntent): Intent {
  return {
    orderId: raw.orderId,
    intentType: raw.intentType as IntentType,
    phase: raw.phase as IntentPhase,
    user: raw.user,
    solver: raw.solver,
    originChainId: raw.originChainId ? BigInt(raw.originChainId) : undefined,
    destinationChainId: raw.destinationChainId ? BigInt(raw.destinationChainId) : undefined,
    amount: raw.amount ? BigInt(raw.amount) : undefined,
    fillDeadline: raw.fillDeadline ? BigInt(raw.fillDeadline) : undefined,
    expires: raw.expires ? BigInt(raw.expires) : undefined,
    nonce: raw.nonce ? BigInt(raw.nonce) : undefined,
    fillOracle: raw.fillOracle,
    intentOracle: raw.intentOracle,
    inputAmount: raw.inputAmount ? BigInt(raw.inputAmount) : undefined,
    outputAmount: raw.outputAmount ? BigInt(raw.outputAmount) : undefined,
    outputRecipient: raw.outputRecipient,
    txHash: raw.txHash,
    blockNumber: BigInt(raw.blockNumber),
    timestamp: BigInt(raw.timestamp),
  };
}

function convertRawTimelineEvent(raw: RawTimelineEvent): IntentTimelineEvent {
  return {
    id: raw.id,
    orderId: raw.orderId,
    phase: raw.phase as IntentPhase,
    intentType: raw.intentType as IntentType,
    user: raw.user,
    solver: raw.solver,
    amount: raw.amount ? BigInt(raw.amount) : undefined,
    originChainId: raw.originChainId ? BigInt(raw.originChainId) : undefined,
    destinationChainId: raw.destinationChainId ? BigInt(raw.destinationChainId) : undefined,
    fillDeadline: raw.fillDeadline ? BigInt(raw.fillDeadline) : undefined,
    expires: raw.expires ? BigInt(raw.expires) : undefined,
    nonce: raw.nonce ? BigInt(raw.nonce) : undefined,
    fillOracle: raw.fillOracle,
    intentOracle: raw.intentOracle,
    inputAmount: raw.inputAmount ? BigInt(raw.inputAmount) : undefined,
    outputAmount: raw.outputAmount ? BigInt(raw.outputAmount) : undefined,
    outputRecipient: raw.outputRecipient,
    txHash: raw.txHash,
    blockNumber: BigInt(raw.blockNumber),
    timestamp: BigInt(raw.timestamp),
  };
}
