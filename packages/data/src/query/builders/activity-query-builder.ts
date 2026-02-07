/**
 * Query builder for Activity entities
 * For the unified timeline of privacy pool events (deposits, withdrawals, cross-chain)
 * Supports type-safe filtering by activity type
 */

import type { IndexerClient } from '../../client/indexer-client.js';
import type {
  Activity,
  ActivityType,
  ASPStatus,
  SerializedActivity,
  DepositActivity,
  WithdrawalActivity,
  Withdraw2Activity,
  CrossChainDepositActivity,
  CrossChainWithdrawalActivity,
  CrossChainWithdraw2Activity,
  SerializedDepositActivity,
  SerializedWithdrawalActivity,
  SerializedWithdraw2Activity,
  SerializedCrossChainDepositActivity,
  SerializedCrossChainWithdrawalActivity,
  SerializedCrossChainWithdraw2Activity,
  ActivityTypeMap,
  SerializedActivityTypeMap,
  PaginatedResponse,
} from '../../types/indexer.js';
import { BaseQueryBuilder } from './base-query-builder.js';
import { ActivityFields, ActivityWhereInput, ActivityOrderBy, GraphQLVariables } from '../types.js';
import { serializeActivity } from '../../transformers/index.js';

/**
 * Activity Query Builder
 * Generic type T allows for typed results based on activity type
 */
export class ActivityQueryBuilder<
  T extends Activity = Activity,
  S extends SerializedActivity = SerializedActivity,
> extends BaseQueryBuilder<T, S, ActivityFields, ActivityWhereInput, ActivityOrderBy> {
  constructor(private indexerClient: IndexerClient) {
    super(indexerClient, 'activitys', 'timestamp', 'desc');
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

    const queryName = `GetActivities`;

    return `
      query ${queryName}(${variables}) {
        activitys(${args}) {
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

  protected getSerializer(): (entity: T) => S {
    return serializeActivity as unknown as (entity: T) => S;
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

  private addVariableDeclarations(where: Partial<ActivityWhereInput>, declarations: string[]): void {
    for (const [key] of Object.entries(where)) {
      switch (key) {
        case 'id':
        case 'type':
        case 'intentStatus':
        case 'aspStatus':
        case 'poolId':
        case 'user':
        case 'processor':
        case 'recipient':
        case 'commitment':
        case 'label':
        case 'precommitmentHash':
        case 'spentNullifier':
        case 'newCommitment':
        case 'orderId':
        case 'originChainId':
        case 'destinationChainId':
          declarations.push(`$${key}: String`);
          break;
        case 'amount_gte':
        case 'amount_lte':
        case 'amount_gt':
        case 'amount_lt':
        case 'blockNumber_gte':
        case 'blockNumber_lte':
        case 'timestamp_gte':
        case 'timestamp_lte':
          declarations.push(`$${key}: String`);
          break;
        case 'isSponsored':
          declarations.push(`$${key}: Boolean`);
          break;
      }
    }
  }

  private addWhereVariables(where: Partial<ActivityWhereInput>, variables: GraphQLVariables): void {
    for (const [key, value] of Object.entries(where)) {
      if (value !== undefined && value !== null) {
        variables[key] = value as string | number | boolean;
      }
    }
  }

  private buildWhereConditions(where: Partial<ActivityWhereInput>): string[] {
    const conditions: string[] = [];

    for (const [key] of Object.entries(where)) {
      conditions.push(`${key}: $${key}`);
    }

    return conditions;
  }

  protected getDefaultFields(): string {
    return `
      id
      type
      intentStatus
      aspStatus
      poolId
      user
      processor
      recipient
      amount
      originalAmount
      vettingFeeAmount
      vettingFeeRecipient
      commitment
      label
      precommitmentHash
      spentNullifier
      spentNullifier1
      newCommitment
      refundCommitment
      relayFeeAmount
      solverFeeAmount
      paymasterFeeRefund
      relayer
      solver
      isSponsored
      orderId
      blockNumber
      timestamp
      originTransactionHash
      destinationTransactionHash
      originChainId
      destinationChainId
    `;
  }

  /**
   * ========================================
   * FILTERING METHODS
   * ========================================
   */

  /**
   * Filter by activity type (generic version)
   */
  byType(type: ActivityType): this {
    this.where({ type: type });
    return this;
  }

  /**
   * Filter by activity type with type narrowing
   * Returns a typed query builder for the specific activity type
   */
  byTyped<K extends keyof ActivityTypeMap>(
    type: K
  ): ActivityQueryBuilder<ActivityTypeMap[K], SerializedActivityTypeMap[K]> {
    this.where({ type: type });
    return this as unknown as ActivityQueryBuilder<ActivityTypeMap[K], SerializedActivityTypeMap[K]>;
  }

  /**
   * Filter by ASP status
   */
  byASPStatus(status: ASPStatus): this {
    this.where({ aspStatus: status });
    return this;
  }

  /**
   * Filter by pool ID
   */
  byPool(poolId: string): this {
    this.where({ poolId: poolId });
    return this;
  }

  /**
   * Filter by user address
   */
  byUser(user: string): this {
    this.where({ user: user.toLowerCase() });
    return this;
  }

  /**
   * Filter by recipient address (for withdrawals)
   */
  byRecipient(recipient: string): this {
    this.where({ recipient: recipient.toLowerCase() });
    return this;
  }

  /**
   * Filter by precommitment hash (for deposit matching)
   */
  byPrecommitment(precommitmentHash: string): this {
    this.where({ precommitmentHash: precommitmentHash });
    return this;
  }

  /**
   * Filter by nullifier (for withdrawal matching)
   */
  byNullifier(spentNullifier: string): this {
    this.where({ spentNullifier: spentNullifier });
    return this;
  }

  /**
   * Filter by commitment
   */
  byCommitment(commitment: string): this {
    this.where({ commitment: commitment });
    return this;
  }

  /**
   * Filter by label (inserted commitment)
   */
  byLabel(label: string): this {
    this.where({ label: label });
    return this;
  }

  /**
   * Filter by cross-chain order ID
   */
  byOrderId(orderId: string): this {
    this.where({ orderId: orderId });
    return this;
  }

  /**
   * Filter by origin chain ID
   */
  byOriginChain(chainId: string | number): this {
    this.where({ originChainId: chainId.toString() });
    return this;
  }

  /**
   * Filter by destination chain ID
   */
  byDestinationChain(chainId: string | number): this {
    this.where({ destinationChainId: chainId.toString() });
    return this;
  }

  /**
   * Filter activities after timestamp
   */
  afterTimestamp(timestamp: string | number): this {
    this.where({ timestamp_gte: timestamp.toString() });
    return this;
  }

  /**
   * Filter activities before timestamp
   */
  beforeTimestamp(timestamp: string | number): this {
    this.where({ timestamp_lte: timestamp.toString() });
    return this;
  }

  /**
   * Filter activities after block
   */
  afterBlock(block: string | number): this {
    this.where({ blockNumber_gte: block.toString() });
    return this;
  }

  /**
   * Filter activities before block
   */
  beforeBlock(block: string | number): this {
    this.where({ blockNumber_lte: block.toString() });
    return this;
  }

  /**
   * Filter by minimum amount
   */
  withMinAmount(amount: string | number): this {
    this.where({ amount_gte: amount.toString() });
    return this;
  }

  /**
   * Filter by maximum amount
   */
  withMaxAmount(amount: string | number): this {
    this.where({ amount_lte: amount.toString() });
    return this;
  }

  /**
   * Filter only sponsored operations (Account Abstraction)
   */
  onlySponsored(): this {
    this.where({ isSponsored: true });
    return this;
  }

  /**
   * Filter only refunded cross-chain operations
   */
  onlyRefunded(): this {
    this.where({ intentStatus: 'refunded' });
    return this;
  }

  /**
   * ========================================
   * TYPED CONVENIENCE FILTERS
   * ========================================
   */

  /**
   * Filter only deposit activities (returns typed DepositActivity[])
   */
  onlyDeposits(): ActivityQueryBuilder<DepositActivity, SerializedDepositActivity> {
    return this.byTyped('DEPOSIT');
  }

  /**
   * Filter only withdrawal activities (returns typed WithdrawalActivity[])
   */
  onlyWithdrawals(): ActivityQueryBuilder<WithdrawalActivity, SerializedWithdrawalActivity> {
    return this.byTyped('WITHDRAWAL');
  }

  /**
   * Filter only Withdraw2 activities - 2:1 JoinSplit (returns typed Withdraw2Activity[])
   */
  onlyWithdraw2(): ActivityQueryBuilder<Withdraw2Activity, SerializedWithdraw2Activity> {
    return this.byTyped('WITHDRAW2');
  }

  /**
   * Filter only cross-chain deposit activities
   */
  onlyCrossChainDeposits(): ActivityQueryBuilder<
    CrossChainDepositActivity,
    SerializedCrossChainDepositActivity
  > {
    return this.byTyped('CROSSCHAIN_DEPOSIT');
  }

  /**
   * Filter only cross-chain withdrawal activities
   */
  onlyCrossChainWithdrawals(): ActivityQueryBuilder<
    CrossChainWithdrawalActivity,
    SerializedCrossChainWithdrawalActivity
  > {
    return this.byTyped('CROSSCHAIN_WITHDRAWAL');
  }

  /**
   * Filter only cross-chain Withdraw2 activities - 2:1 JoinSplit cross-chain
   */
  onlyCrossChainWithdraw2(): ActivityQueryBuilder<
    CrossChainWithdraw2Activity,
    SerializedCrossChainWithdraw2Activity
  > {
    return this.byTyped('CROSSCHAIN_WITHDRAW2');
  }

  /**
   * Filter only pending ASP approval
   */
  onlyPendingASP(): this {
    return this.byASPStatus('pending');
  }

  /**
   * Filter only approved by ASP
   */
  onlyApprovedASP(): this {
    return this.byASPStatus('approved');
  }

  /**
   * Filter only activated deposits (has label)
   */
  onlyActivated(): this {
    this.where({ label_not: null });
    return this;
  }

  /**
   * Filter only non-activated deposits (no label, pending solver fill)
   */
  onlyPendingSolverFill(): this {
    this.where({ label_is: null });
    return this;
  }

  /**
   * Filter activities within a time range
   */
  betweenTimestamps(startTimestamp: string | number, endTimestamp: string | number): this {
    this.afterTimestamp(startTimestamp);
    this.beforeTimestamp(endTimestamp);
    return this;
  }

  /**
   * Filter activities within a block range
   */
  betweenBlocks(startBlock: string | number, endBlock: string | number): this {
    this.afterBlock(startBlock);
    this.beforeBlock(endBlock);
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
   * Order by block number
   */
  orderByBlock(direction: 'asc' | 'desc' = 'desc'): this {
    this.orderBy('blockNumber', direction);
    return this;
  }

  /**
   * Order by amount
   */
  orderByAmount(direction: 'asc' | 'desc' = 'desc'): this {
    this.orderBy('amount', direction);
    return this;
  }

  /**
   * Order by activity type
   */
  orderByType(direction: 'asc' | 'desc' = 'asc'): this {
    this.orderBy('type', direction);
    return this;
  }

  /**
   * Order by ASP status
   */
  orderByASPStatus(direction: 'asc' | 'desc' = 'asc'): this {
    this.orderBy('aspStatus', direction);
    return this;
  }

  // ========================================
  // RAW ITEM CONVERSION
  // ========================================

  /**
   * Convert raw GraphQL items to typed Activity entities
   * Handles BigInt string to BigInt conversion
   */
  protected convertRawItems(rawItems: unknown[]): T[] {
    return (rawItems as RawActivity[]).map(convertRawActivity) as T[];
  }

  // ========================================
  // PAGINATED EXECUTION
  // ========================================

  /**
   * Execute and return paginated response
   * Properly handles Ponder's pagination format and BigInt conversions
   */
  async executePaginated(): Promise<PaginatedResponse<T>> {
    if (!this.config.first) {
      this.config.first = 100;
    }

    const query = this.buildDynamicQuery();
    const variables = this.buildVariables();

    const result = await this.indexerClient.executeQuery<{
      activitys: { items: RawActivity[]; pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean } };
    }>(query, variables);

    const items = (result.activitys?.items || []).map(convertRawActivity) as T[];

    return {
      items,
      pageInfo: result.activitys?.pageInfo || { hasNextPage: false, hasPreviousPage: false },
    };
  }

  /**
   * Execute and return paginated serialized response
   */
  async executePaginatedSerialized(): Promise<PaginatedResponse<S>> {
    const result = await this.executePaginated();
    const serializer = this.getSerializer();
    return {
      items: result.items.map(serializer),
      pageInfo: result.pageInfo,
    };
  }
}

// ========================================
// RAW TYPES AND CONVERTERS
// ========================================

interface RawActivity {
  id: string;
  type: string;
  intentStatus?: string;
  aspStatus: string;
  poolId: string;
  user?: string;
  processor?: string;
  recipient?: string;
  amount: string | null;
  originalAmount?: string;
  vettingFeeAmount?: string;
  vettingFeeRecipient?: string;
  commitment: string;
  label?: string | null;
  precommitmentHash?: string;
  spentNullifier?: string;
  spentNullifier1?: string;
  newCommitment?: string;
  refundCommitment?: string;
  relayFeeAmount?: string;
  solverFeeAmount?: string;
  paymasterFeeRefund?: string;
  relayer?: string;
  solver?: string;
  isSponsored?: boolean;
  orderId?: string;
  blockNumber: string;
  timestamp: string;
  originTransactionHash: string;
  destinationTransactionHash?: string;
  originChainId: string | null;
  destinationChainId: string | null;
}

function convertRawActivity(raw: RawActivity): Activity {
  return {
    ...raw,
    type: raw.type as ActivityType,
    aspStatus: raw.aspStatus as ASPStatus,
    amount: raw.amount ? BigInt(raw.amount) : null,
    originalAmount: raw.originalAmount ? BigInt(raw.originalAmount) : undefined,
    vettingFeeAmount: raw.vettingFeeAmount ? BigInt(raw.vettingFeeAmount) : undefined,
    relayFeeAmount: raw.relayFeeAmount ? BigInt(raw.relayFeeAmount) : undefined,
    solverFeeAmount: raw.solverFeeAmount ? BigInt(raw.solverFeeAmount) : undefined,
    paymasterFeeRefund: raw.paymasterFeeRefund ? BigInt(raw.paymasterFeeRefund) : undefined,
    blockNumber: BigInt(raw.blockNumber),
    timestamp: BigInt(raw.timestamp),
    originChainId: raw.originChainId ? BigInt(raw.originChainId) : null,
    destinationChainId: raw.destinationChainId ? BigInt(raw.destinationChainId) : null,
  } as Activity;
}

/**
 * ========================================
 * TYPED QUERY BUILDER FACTORIES
 * ========================================
 */

/**
 * Create a typed deposit activity query builder
 */
export function createDepositActivityQueryBuilder(
  client: IndexerClient
): ActivityQueryBuilder<DepositActivity, SerializedDepositActivity> {
  return new ActivityQueryBuilder<DepositActivity, SerializedDepositActivity>(client).onlyDeposits();
}

/**
 * Create a typed withdrawal activity query builder
 */
export function createWithdrawalActivityQueryBuilder(
  client: IndexerClient
): ActivityQueryBuilder<WithdrawalActivity, SerializedWithdrawalActivity> {
  return new ActivityQueryBuilder<WithdrawalActivity, SerializedWithdrawalActivity>(client).onlyWithdrawals();
}

/**
 * Create a typed Withdraw2 activity query builder (2:1 JoinSplit)
 */
export function createWithdraw2ActivityQueryBuilder(
  client: IndexerClient
): ActivityQueryBuilder<Withdraw2Activity, SerializedWithdraw2Activity> {
  return new ActivityQueryBuilder<Withdraw2Activity, SerializedWithdraw2Activity>(client).onlyWithdraw2();
}

/**
 * Create a typed cross-chain deposit activity query builder
 */
export function createCrossChainDepositActivityQueryBuilder(
  client: IndexerClient
): ActivityQueryBuilder<CrossChainDepositActivity, SerializedCrossChainDepositActivity> {
  return new ActivityQueryBuilder<CrossChainDepositActivity, SerializedCrossChainDepositActivity>(
    client
  ).onlyCrossChainDeposits();
}

/**
 * Create a typed cross-chain withdrawal activity query builder
 */
export function createCrossChainWithdrawalActivityQueryBuilder(
  client: IndexerClient
): ActivityQueryBuilder<CrossChainWithdrawalActivity, SerializedCrossChainWithdrawalActivity> {
  return new ActivityQueryBuilder<CrossChainWithdrawalActivity, SerializedCrossChainWithdrawalActivity>(
    client
  ).onlyCrossChainWithdrawals();
}

/**
 * Create a typed cross-chain Withdraw2 activity query builder (2:1 JoinSplit cross-chain)
 */
export function createCrossChainWithdraw2ActivityQueryBuilder(
  client: IndexerClient
): ActivityQueryBuilder<CrossChainWithdraw2Activity, SerializedCrossChainWithdraw2Activity> {
  return new ActivityQueryBuilder<CrossChainWithdraw2Activity, SerializedCrossChainWithdraw2Activity>(
    client
  ).onlyCrossChainWithdraw2();
}
