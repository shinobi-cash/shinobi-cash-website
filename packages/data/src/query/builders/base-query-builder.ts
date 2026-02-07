import { IndexerClient } from '../../client/indexer-client.js';
import { QueryConfig, GraphQLVariables } from '../types.js';

/**
 * Base query builder with common functionality
 *
 * This abstract class provides the foundation for all entity-specific query builders.
 * Each concrete builder must implement the three core methods with proper typing.
 *
 * @template TEntity - The raw entity type from GraphQL (Pool, PaymasterContract, etc.)
 * @template TSerializedEntity - The serialized entity type (SerializedPool, etc.)
 * @template TFields - Union type of available fields for the entity
 * @template TWhereInput - Type for where condition input for the entity
 * @template TOrderBy - Union type of valid orderBy fields
 */
export abstract class BaseQueryBuilder<
  TEntity,
  TSerializedEntity,
  TFields extends string,
  TWhereInput,
  TOrderBy extends string,
> {
  protected config: QueryConfig<TWhereInput, TOrderBy> = {};

  // Safety limits
  private static readonly MAX_SAFE_LIMIT = 1000;
  private static readonly DEFAULT_LIMIT = 100;

  constructor(
    protected client: IndexerClient,
    protected entityName: string,
    defaultOrderBy: TOrderBy,
    defaultOrderDirection: 'asc' | 'desc' = 'desc'
  ) {
    // Basic validation
    if (!entityName || typeof entityName !== 'string') {
      throw new Error('Entity name must be a non-empty string');
    }

    this.entityName = entityName;
    this.config.orderBy = defaultOrderBy;
    this.config.orderDirection = defaultOrderDirection;
  }

  // ========================================
  // ABSTRACT METHODS - Each builder implements these
  // ========================================

  /**
   * Build the GraphQL query string with proper types and validation
   * Each builder knows its own schema and field types
   */
  protected abstract buildDynamicQuery(): string;

  /**
   * Build variables object with proper type conversion
   * Each builder handles its own BigInt/string conversions
   */
  protected abstract buildVariables(): GraphQLVariables;

  /**
   * Build where clause string with typed fields and validation
   * Each builder validates its own where conditions
   */
  protected abstract buildWhereClauseString(): string;

  /**
   * Get the serializer function for this entity type
   * Each builder provides its own serializer from transformers
   */
  protected abstract getSerializer(): (entity: TEntity) => TSerializedEntity;

  // ========================================
  // COMMON FLUENT API METHODS
  // ========================================

  /**
   * Select specific fields to be returned
   * @param fields - Array of field names to select
   * @returns The query builder instance for chaining
   */
  select(fields: TFields[]): this {
    if (!Array.isArray(fields)) {
      throw new Error('Fields must be an array');
    }

    if (fields.length === 0) {
      throw new Error('Fields array cannot be empty');
    }

    this.config.selectedFields = fields;
    return this;
  }

  /**
   * Add where conditions to the query
   * @param where - Object representing where conditions
   * @returns The query builder instance for chaining
   */
  where(where: Partial<TWhereInput>): this {
    if (typeof where !== 'object' || where === null) {
      throw new Error('Where conditions must be an object');
    }

    this.config.where = this.deepMergeWhereConditions(this.config.where || {}, where);
    return this;
  }

  private deepMergeWhereConditions(
    existing: Partial<TWhereInput>,
    newWhere: Partial<TWhereInput>
  ): Partial<TWhereInput> {
    const result = { ...existing } as Record<string, unknown>;

    for (const [key, value] of Object.entries(newWhere)) {
      if (key.endsWith('_') && typeof value === 'object' && value !== null) {
        // Deep merge for GraphQL relationship fields (pool_, paymaster_, etc.)
        const existingValue = result[key];
        if (typeof existingValue === 'object' && existingValue !== null) {
          result[key] = { ...existingValue, ...(value as object) };
        } else {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }

    return result as Partial<TWhereInput>;
  }

  /**
   * Limit the number of results
   * @param limit - Maximum number of results (capped at 1000 for safety)
   * @returns The query builder instance for chaining
   */
  limit(limit: number): this {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error('Limit must be a positive integer');
    }

    const safeLimit = Math.min(limit, BaseQueryBuilder.MAX_SAFE_LIMIT);
    this.config.first = safeLimit;
    return this;
  }

  /**
   * Skip a number of results for pagination
   * @param skip - Number of results to skip
   * @returns The query builder instance for chaining
   */
  skip(skip: number): this {
    if (!Number.isInteger(skip) || skip < 0) {
      throw new Error('Skip must be a non-negative integer');
    }

    this.config.skip = skip;
    return this;
  }

  /**
   * Set the ordering for the results
   * @param orderBy - Field to order by
   * @param direction - Order direction ("asc" or "desc")
   * @returns The query builder instance for chaining
   */
  orderBy(orderBy: TOrderBy, direction: 'asc' | 'desc' = 'desc'): this {
    if (!orderBy || typeof orderBy !== 'string') {
      throw new Error('OrderBy field must be a non-empty string');
    }

    if (direction !== 'asc' && direction !== 'desc') {
      throw new Error('Order direction must be "asc" or "desc"');
    }

    this.config.orderBy = orderBy;
    this.config.orderDirection = direction;
    return this;
  }

  // ========================================
  // EXECUTION METHODS
  // ========================================

  /**
   * Execute the query and return raw entities
   * @returns Promise resolving to an array of TEntity
   */
  async execute(): Promise<TEntity[]> {
    // Apply default limit if none specified
    if (!this.config.first) {
      this.config.first = BaseQueryBuilder.DEFAULT_LIMIT;
    }

    const query = this.buildDynamicQuery();
    const variables = this.buildVariables();
    const result = await this.client.executeQuery<{
      [key: string]: { items: unknown[]; pageInfo: { hasNextPage: boolean } } | unknown[];
    }>(query, variables);

    const data = result[this.entityName];

    // Handle Ponder's paginated response format: { items: [...], pageInfo: {...} }
    if (data && typeof data === 'object' && 'items' in data) {
      return this.convertRawItems(data.items);
    }

    // Fallback for direct array response
    return this.convertRawItems((data as unknown[]) || []);
  }

  /**
   * Execute the query and return properly typed serialized entities
   * @returns Promise resolving to an array of TSerializedEntity (not any!)
   */
  async executeAndSerialize(): Promise<TSerializedEntity[]> {
    const rawResults = await this.execute();
    const serializer = this.getSerializer();
    return rawResults.map((entity) => serializer(entity));
  }

  /**
   * Execute the query and return the first result
   * @returns Promise resolving to the first TEntity or null
   */
  async first(): Promise<TEntity | null> {
    const originalFirst = this.config.first;
    this.config.first = 1;

    try {
      const results = await this.execute();
      return results.length > 0 ? (results[0] ?? null) : null;
    } finally {
      // Always restore original limit
      this.config.first = originalFirst;
    }
  }

  /**
   * Execute the query and return the first result as serialized entity
   * @returns Promise resolving to the first TSerializedEntity or null
   */
  async firstSerialized(): Promise<TSerializedEntity | null> {
    const entity = await this.first();
    if (!entity) return null;

    const serializer = this.getSerializer();
    return serializer(entity);
  }

  /**
   * Execute the query and check if any results exist
   * @returns Promise resolving to true if any results exist
   */
  async exists(): Promise<boolean> {
    const result = await this.first();
    return result !== null;
  }

  /**
   * Execute the query and return the count of results
   * Note: This fetches all results and counts them
   * @returns Promise resolving to the count of matching entities
   */
  async count(): Promise<number> {
    const results = await this.execute();
    return results.length;
  }

  /**
   * Create an async iterator that yields batches of results across all pages
   *
   * @param batchSize - Number of items per batch (default: 1000)
   * @returns AsyncGenerator yielding arrays of TEntity
   *
   * @example
   * ```typescript
   * // Process in batches (memory efficient)
   * for await (const batch of queryBuilder.stateTree().byPool(poolId).paginate()) {
   *   processBatch(batch);
   * }
   *
   * // Collect all items
   * const allItems = await queryBuilder.stateTree().byPool(poolId).paginate().toArray();
   * ```
   */
  paginate(batchSize: number = 1000): PaginatedIterator<TEntity, TSerializedEntity> {
    return new PaginatedIterator(this, batchSize);
  }

  /**
   * Clone the current query builder instance
   * @returns A new instance of the query builder with the same configuration
   */
  clone(): this {
    // Create new instance using the same constructor
    const cloned = new (this.constructor as any)(
      this.client,
      this.entityName,
      this.config.orderBy,
      this.config.orderDirection
    );

    // Deep clone the configuration
    cloned.config = {
      ...this.config,
      where: this.config.where ? { ...this.config.where } : undefined,
      selectedFields: this.config.selectedFields ? [...this.config.selectedFields] : undefined,
    };

    return cloned;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get current query configuration (for debugging)
   * @returns Current configuration object
   */
  getConfig(): QueryConfig<TWhereInput, TOrderBy> {
    return { ...this.config };
  }

  /**
   * Reset the query builder to default state
   * @returns The query builder instance for chaining
   */
  reset(): this {
    this.config = {
      orderBy: this.config.orderBy, // Keep default orderBy
      orderDirection: this.config.orderDirection, // Keep default direction
    };
    return this;
  }

  /**
   * Convert raw items from GraphQL response to typed entities.
   * Override in subclasses that need to convert BigInt strings, etc.
   * @param rawItems - Raw items from GraphQL response
   * @returns Converted typed entities
   */
  protected convertRawItems(rawItems: unknown[]): TEntity[] {
    return rawItems as TEntity[];
  }

  /**
   * Internal method for paginated iteration.
   * Returns items and hasNextPage flag.
   */
  async _executePage(offset: number, limit: number): Promise<{ items: TEntity[]; hasNextPage: boolean }> {
    // Store original config
    const originalFirst = this.config.first;
    const originalSkip = this.config.skip;

    try {
      this.config.first = limit;
      this.config.skip = offset;

      const query = this.buildDynamicQuery();
      const variables = this.buildVariables();
      const result = await this.client.executeQuery<{
        [key: string]: { items: unknown[]; pageInfo: { hasNextPage: boolean } };
      }>(query, variables);

      const data = result[this.entityName];
      const rawItems = data?.items || [];

      return {
        items: this.convertRawItems(rawItems),
        hasNextPage: data?.pageInfo?.hasNextPage ?? false,
      };
    } finally {
      // Restore original config
      this.config.first = originalFirst;
      this.config.skip = originalSkip;
    }
  }
}

/**
 * Paginated iterator for fetching all results across pages
 *
 * Implements AsyncIterable for use with `for await...of` loops.
 * Also provides convenience methods for collecting all results.
 */
export class PaginatedIterator<TEntity, TSerializedEntity> implements AsyncIterable<TEntity[]> {
  constructor(
    private builder: BaseQueryBuilder<TEntity, TSerializedEntity, any, any, any>,
    private batchSize: number
  ) {}

  /**
   * Async iterator implementation - yields batches of entities
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<TEntity[], void, unknown> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { items, hasNextPage } = await this.builder._executePage(offset, this.batchSize);

      if (items.length > 0) {
        yield items;
      }

      hasMore = hasNextPage && items.length > 0;
      offset += items.length;
    }
  }

  /**
   * Collect all items into a single array
   *
   * @returns Promise resolving to array of all entities
   *
   * @example
   * ```typescript
   * const allLeaves = await client.query()
   *   .stateTree()
   *   .byPool(poolId)
   *   .paginate()
   *   .toArray();
   * ```
   */
  async toArray(): Promise<TEntity[]> {
    const allItems: TEntity[] = [];
    for await (const batch of this) {
      allItems.push(...batch);
    }
    return allItems;
  }

  /**
   * Collect all items into a single array with serialization
   *
   * @returns Promise resolving to array of all serialized entities
   *
   * @example
   * ```typescript
   * const allLeaves = await client.query()
   *   .stateTree()
   *   .byPool(poolId)
   *   .paginate()
   *   .toArraySerialized();
   * ```
   */
  async toArraySerialized(): Promise<TSerializedEntity[]> {
    const allItems = await this.toArray();
    const serializer = (this.builder as any).getSerializer();
    return allItems.map((item) => serializer(item));
  }
}
