import { GraphQLClient } from 'graphql-request';
import { QueryBuilder } from '../query/query-builder.js';

/**
 * Configuration for the indexer client
 */
export type IndexerClientOptions = {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
};

/**
 * Chain indexing status from Ponder's _meta query
 */
export interface ChainIndexingStatus {
  /** Whether the chain is ready for queries */
  ready: boolean;
  /** Current indexed block info */
  block?: {
    number: number;
    timestamp: number;
  };
}

/**
 * Health check response from the indexer
 */
export interface IndexerHealthResponse {
  /** Overall status: 'healthy' if at least one chain is indexed, 'unknown' otherwise */
  status: 'healthy' | 'unknown';
  /** Per-chain indexing status */
  chains: Record<string, ChainIndexingStatus>;
}

/**
 * Raw _meta response from Ponder GraphQL
 */
interface PonderMetaResponse {
  _meta: {
    status: Record<string, ChainIndexingStatus>;
  };
}

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  /** Number of items to fetch (default: 100) */
  first?: number;
  /** Number of items to skip (default: 0) */
  skip?: number;
}

/**
 * Clean, focused indexer client for data access
 * Handles GraphQL communication with the Shinobi Cash indexer
 */
export class IndexerClient {
  private client: GraphQLClient;
  private options: IndexerClientOptions;
  private requestMap: Map<string, Promise<any>> = new Map();
  private readonly maxPendingRequests = 100;

  constructor(options: IndexerClientOptions) {
    this.options = options;
    this.client = new GraphQLClient(options.endpoint, {
      headers: options.headers,
    });
  }

  /**
   * Generate a unique key for a query/variables combination
   *
   * @param query - GraphQL query string
   * @param variables - Query variables
   * @returns Unique key for the request
   */
  private generateRequestKey(query: string, variables: Record<string, any>): string {
    // Create a consistent key from query and variables
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const sortedVariables = Object.keys(variables)
      .sort()
      .reduce(
        (sorted, key) => {
          sorted[key] = variables[key];
          return sorted;
        },
        {} as Record<string, any>
      );

    return `${normalizedQuery}|${JSON.stringify(sortedVariables)}`;
  }

  /**
   * Clean up completed request from the map
   *
   * @param requestKey - Key of the request to clean up
   */
  private cleanupRequest(requestKey: string): void {
    this.requestMap.delete(requestKey);
  }

  /**
   * Clean up old requests if map gets too large
   */
  private cleanupOldRequests(): void {
    if (this.requestMap.size > this.maxPendingRequests) {
      // Clear half of the oldest requests
      const keysToDelete = Array.from(this.requestMap.keys()).slice(0, this.maxPendingRequests / 2);
      keysToDelete.forEach((key) => this.requestMap.delete(key));
    }
  }

  /**
   * Create IndexerClient for a specific pool
   *
   * @param poolId - The pool ID to query
   * @param endpoint - Indexer GraphQL endpoint
   * @param options - Optional configuration overrides
   * @returns Configured IndexerClient instance
   *
   * @example
   * ```typescript
   * // Create for Arbitrum Sepolia pool
   * const client = IndexerClient.createForPool(
   *   '0x5543b250b8a44513BA91C0346BeE40890FfD7D18',
   *   'https://indexer.shinobi.cash/graphql'
   * );
   *
   * // Create with auth headers
   * const client = IndexerClient.createForPool(
   *   '0x5543b250b8a44513BA91C0346BeE40890FfD7D18',
   *   'https://indexer.shinobi.cash/graphql',
   *   {
   *     headers: { 'Authorization': 'Bearer token' },
   *     timeout: 60000
   *   }
   * );
   * ```
   */
  static createForPool(
    poolId: string,
    endpoint: string,
    options: {
      /** Custom headers (e.g., auth tokens) */
      headers?: Record<string, string>;
      /** Request timeout in milliseconds */
      timeout?: number;
    } = {}
  ): IndexerClient {
    return new IndexerClient({
      endpoint,
      ...options,
    });
  }

  /**
   * ✨ Create a fluent query builder instance
   *
   * This is the main entry point for the query builder API.
   * Provides a fluent interface for building complex queries with type safety.
   *
   * @returns QueryBuilder for fluent query building
   *
   * @example
   * ```typescript
   * // Query activities
   * const deposits = await client
   *   .query()
   *   .activities()
   *   .byPool(poolId)
   *   .onlyDeposits()
   *   .afterTimestamp(Date.now() - 86400000)
   *   .orderByTimestamp('desc')
   *   .limit(50)
   *   .executeAndSerialize();
   *
   * // Query state tree for proofs
   * const leaves = await client
   *   .query()
   *   .stateTree()
   *   .byPool(poolId)
   *   .orderByLeafIndex('asc')
   *   .limit(10000)
   *   .execute();
   *
   * // Get latest ASP root
   * const aspRoot = await client
   *   .query()
   *   .aspApprovals()
   *   .latest();
   * ```
   */
  query(): QueryBuilder {
    return new QueryBuilder(this);
  }

  /**
   * Execute a raw GraphQL query with request deduplication
   *
   * This method provides a generic interface for executing any GraphQL query,
   * with built-in deduplication to prevent duplicate requests for identical queries.
   *
   * @template T - The expected response type
   * @param query - GraphQL query string
   * @param variables - Query variables object
   * @returns Promise resolving to the query response data
   *
   * @example
   * ```typescript
   * const response = await client.executeQuery<{ pool: Pool }>(
   *   'query GetPool($id: String!) { pool(id: $id) { id totalDeposits } }',
   *   { id: '0x5543b250b8a44513BA91C0346BeE40890FfD7D18' }
   * );
   * console.log(response.pool);
   * ```
   */
  async executeQuery<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
    // Generate unique key for this request
    const requestKey = this.generateRequestKey(query, variables);

    // Check if identical request is already in progress
    const existingRequest = this.requestMap.get(requestKey);
    if (existingRequest) {
      return existingRequest;
    }

    // Clean up old requests if needed
    this.cleanupOldRequests();

    // Create new request promise
    const requestPromise = this.client
      .request<T>(query, variables)
      .then((response) => {
        // Clean up this request from the map
        this.cleanupRequest(requestKey);
        return response;
      })
      .catch((error) => {
        // Clean up this request from the map even on error
        this.cleanupRequest(requestKey);

        throw error;
      });

    // Store the promise in the map
    this.requestMap.set(requestKey, requestPromise);

    return requestPromise;
  }

  /**
   * Execute a paginated GraphQL query and extract items
   *
   * Handles Ponder's pagination response format where queries return:
   * { queryName: { items: [...], pageInfo: {...} } }
   *
   * @template T - The type of items in the response
   * @param query - GraphQL query string
   * @param variables - Query variables object
   * @returns Promise resolving to paginated response with items and pageInfo
   *
   * @example
   * ```typescript
   * const response = await client.executePaginatedQuery<Activity>(query, { poolId, limit: 100 });
   * console.log(response.items); // Array of activities
   * console.log(response.pageInfo.hasNextPage); // true/false
   * ```
   */
  async executePaginatedQuery<T>(
    query: string,
    variables: Record<string, any> = {}
  ): Promise<import('../types/indexer.js').PaginatedResponse<T>> {
    const result = await this.executeQuery<any>(query, variables);

    // Extract the first key from result (e.g., "activitys", "stateTreeLeaves")
    const queryKey = Object.keys(result)[0];
    if (!queryKey) {
      return {
        items: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const data = result[queryKey];

    // Check if response has Ponder pagination structure
    if (data && typeof data === 'object' && 'items' in data && 'pageInfo' in data) {
      return {
        items: data.items as T[],
        pageInfo: data.pageInfo,
      };
    }

    // Fallback for non-paginated responses (treat as single page)
    return {
      items: (Array.isArray(data) ? data : [data]) as T[],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  /**
   * Execute multiple queries in parallel with deduplication
   *
   * @param queries - Array of query objects with query string and variables
   * @returns Promise resolving to array of query responses
   *
   * @example
   * ```typescript
   * const results = await client.executeQueries([
   *   { query: 'query GetPool($id: String!) { pool(id: $id) { id } }', variables: { id: poolId } },
   *   { query: 'query GetActivities($poolId: String!) { activitys(where: { poolId: $poolId }) { items { id } } }', variables: { poolId } }
   * ]);
   * ```
   */
  async executeQueries<T = any>(queries: Array<{ query: string; variables?: Record<string, any> }>): Promise<T[]> {
    const promises = queries.map(({ query, variables = {} }) => this.executeQuery<T>(query, variables));
    return Promise.all(promises);
  }

  /**
   * Check indexer health and get meta information
   *
   * @returns Promise resolving to health status object
   *
   * @example
   * ```typescript
   * const health = await client.healthCheck();
   * console.log(health); // { status: 'healthy', chains: {...} }
   * ```
   */
  async healthCheck(): Promise<IndexerHealthResponse> {
    const query = `
      query HealthCheck {
        _meta {
          status
        }
      }
    `;
    const result = await this.executeQuery<PonderMetaResponse>(query);
    const metaStatus = result._meta?.status;

    // Extract chain statuses if available
    const chains: Record<string, ChainIndexingStatus> = {};
    if (metaStatus && typeof metaStatus === 'object') {
      for (const [chainName, chainStatus] of Object.entries(metaStatus)) {
        chains[chainName] = chainStatus;
      }
    }

    return {
      status: Object.keys(chains).length > 0 ? 'healthy' : 'unknown',
      chains,
    };
  }

  /**
   * Get the latest indexed block information
   *
   * @returns Promise resolving to block number and timestamp, or null if unavailable
   *
   * @example
   * ```typescript
   * const block = await client.getLatestIndexedBlock();
   * console.log(block); // { blockNumber: '12345678', timestamp: '1234567890' }
   * ```
   */
  async getLatestIndexedBlock(): Promise<{ blockNumber: string; timestamp: string } | null> {
    const query = `
      query GetLatestIndexedBlock {
        _meta {
          status
        }
      }
    `;
    const result = await this.executeQuery<PonderMetaResponse>(query);
    const metaStatus = result._meta?.status;

    if (!metaStatus || typeof metaStatus !== 'object') {
      return null;
    }

    // Find the first chain with block information
    for (const chainName of Object.keys(metaStatus)) {
      const chainStatus = metaStatus[chainName];
      if (chainStatus?.block) {
        return {
          blockNumber: String(chainStatus.block.number),
          timestamp: String(chainStatus.block.timestamp),
        };
      }
    }

    return null;
  }

  /**
   * ========================================
   * CONVENIENCE METHODS
   * ========================================
   */

  /**
   * Get all state tree leaves for a specific pool
   *
   * This is a convenience method that wraps the StateTreeQueryBuilder
   * and automatically paginates through all results.
   *
   * @param poolId - The pool ID to get leaves for
   * @returns Promise resolving to all state tree leaves for the pool, ordered by leafIndex ascending
   *
   * @example
   * ```typescript
   * const leaves = await client.getAllStateTreeLeaves('0x5543b250b8a44513BA91C0346BeE40890FfD7D18');
   * console.log(`Retrieved ${leaves.length} leaves for merkle tree`);
   * ```
   */
  async getAllStateTreeLeaves(poolId: string): Promise<import('../types/indexer.js').StateTreeLeaf[]> {
    return this.query().stateTree().getAllLeavesForTree(poolId);
  }

  /**
   * Get the latest ASP approval root
   *
   * This method properly handles Ponder's paginated response format and converts
   * GraphQL string values to BigInt types.
   *
   * @returns Promise resolving to the latest ASP approval list or null if none exist
   *
   * @example
   * ```typescript
   * const aspRoot = await client.getLatestASPRoot();
   * if (aspRoot) {
   *   console.log(`Latest ASP root: ${aspRoot.root}`);
   *   console.log(`IPFS CID: ${aspRoot.ipfsCID}`);
   * }
   * ```
   */
  async getLatestASPRoot(): Promise<import('../types/indexer.js').ASPApprovalList | null> {
    const query = `
      query GetLatestASPRoot {
        associationSetUpdates(
          orderBy: "timestamp"
          orderDirection: "desc"
          limit: 1
        ) {
          items {
            id
            root
            ipfsCID
            timestamp
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `;

    // Raw response from GraphQL (numeric fields are strings)
    interface RawASPApprovalList {
      id: string;
      root: string;
      ipfsCID: string;
      timestamp: string;
    }

    const result = await this.executePaginatedQuery<RawASPApprovalList>(query, {});

    const item = result.items[0];
    if (!item) {
      return null;
    }

    // Convert string timestamp to bigint
    return {
      id: item.id,
      root: item.root,
      ipfsCID: item.ipfsCID,
      timestamp: BigInt(item.timestamp),
    };
  }

  /**
   * Get pool statistics for a specific pool
   *
   * This is a convenience method that wraps the PoolQueryBuilder
   * and returns the pool entity with all statistics.
   *
   * @param poolId - The pool ID to get statistics for
   * @returns Promise resolving to the pool entity or null if not found
   *
   * @example
   * ```typescript
   * const pool = await client.getPoolStats('0x5543b250b8a44513BA91C0346BeE40890FfD7D18');
   * if (pool) {
   *   console.log(`Total deposits: ${pool.totalDeposits}`);
   *   console.log(`Total withdrawals: ${pool.totalWithdrawals}`);
   *   console.log(`Deposit count: ${pool.depositCount}`);
   * }
   * ```
   */
  async getPoolStats(poolId: string): Promise<import('../types/indexer.js').Pool | null> {
    return this.query().pool().byId(poolId).first();
  }

  /**
   * Get serialized pool statistics for a specific pool
   *
   * Returns pool data with BigInt fields converted to strings for JSON serialization.
   *
   * @param poolId - The pool ID to get statistics for
   * @returns Promise resolving to the serialized pool entity or null if not found
   *
   * @example
   * ```typescript
   * const pool = await client.getPoolStatsSerialized('0x5543b250b8a44513BA91C0346BeE40890FfD7D18');
   * if (pool) {
   *   // Safe to use in JSON.stringify
   *   console.log(JSON.stringify(pool, null, 2));
   * }
   * ```
   */
  async getPoolStatsSerialized(poolId: string): Promise<import('../types/indexer.js').SerializedPool | null> {
    return this.query().pool().byId(poolId).firstSerialized();
  }

  /**
   * Get activities for a pool with pagination support
   *
   * This method properly handles Ponder's paginated response format and converts
   * GraphQL string values to BigInt types.
   *
   * @param options - Query options
   * @param options.poolId - The pool ID to get activities for
   * @param options.limit - Number of activities to fetch (default: 100)
   * @param options.orderDirection - Sort direction: 'asc' or 'desc' (default: 'desc')
   * @param options.offset - Number of items to skip for pagination (default: 0)
   * @returns Promise resolving to paginated response with activities and page info
   *
   * @example
   * ```typescript
   * // Get first page of activities
   * const firstPage = await client.getActivities({
   *   poolId: '0x5543b250b8a44513BA91C0346BeE40890FfD7D18',
   *   limit: 100
   * });
   * console.log(firstPage.items); // Array of activities
   * console.log(firstPage.pageInfo.hasNextPage); // true/false
   *
   * // Get next page using offset
   * if (firstPage.pageInfo.hasNextPage) {
   *   const nextPage = await client.getActivities({
   *     poolId: '0x5543b250b8a44513BA91C0346BeE40890FfD7D18',
   *     limit: 100,
   *     offset: 100
   *   });
   * }
   * ```
   */
  async getActivities(options: {
    poolId: string;
    limit?: number;
    orderDirection?: 'asc' | 'desc';
    offset?: number;
  }): Promise<import('../types/indexer.js').PaginatedResponse<import('../types/indexer.js').Activity>> {
    const { poolId, limit = 100, orderDirection = 'desc', offset } = options;

    const query = `
      query GetActivities($poolId: String!, $limit: Int!, $orderDirection: String!, $offset: Int) {
        activitys(
          where: { poolId: $poolId }
          orderBy: "timestamp"
          orderDirection: $orderDirection
          limit: $limit
          offset: $offset
        ) {
          items {
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
            newCommitment
            refundCommitment
            relayFeeAmount
            solverFeeAmount
            feeRefund
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
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `;

    const variables = { poolId, limit, orderDirection, offset };

    // Raw response from GraphQL (all numeric fields are strings)
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
      newCommitment?: string;
      refundCommitment?: string;
      relayFeeAmount?: string;
      solverFeeAmount?: string;
      feeRefund?: string;
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

    const result = await this.executePaginatedQuery<RawActivity>(query, variables);

    // Convert string fields to bigint for Activity type
    const items = result.items.map((item) => ({
      ...item,
      amount: item.amount ? BigInt(item.amount) : null,
      originalAmount: item.originalAmount ? BigInt(item.originalAmount) : undefined,
      vettingFeeAmount: item.vettingFeeAmount ? BigInt(item.vettingFeeAmount) : undefined,
      relayFeeAmount: item.relayFeeAmount ? BigInt(item.relayFeeAmount) : undefined,
      solverFeeAmount: item.solverFeeAmount ? BigInt(item.solverFeeAmount) : undefined,
      feeRefund: item.feeRefund ? BigInt(item.feeRefund) : undefined,
      blockNumber: BigInt(item.blockNumber),
      timestamp: BigInt(item.timestamp),
      originChainId: item.originChainId ? BigInt(item.originChainId) : null,
      destinationChainId: item.destinationChainId ? BigInt(item.destinationChainId) : null,
    })) as import('../types/indexer.js').Activity[];

    return {
      items,
      pageInfo: result.pageInfo,
    };
  }
}

/**
 * ========================================
 * GLOBAL SINGLETON PATTERN
 * ========================================
 */

/**
 * Global IndexerClient instance for use in React hooks and other contexts
 * where passing the client around is inconvenient
 */
let globalClient: IndexerClient | null = null;

/**
 * Set the global IndexerClient instance
 *
 * This is useful for React hooks that need access to the client without
 * requiring it to be passed as a prop.
 *
 * @param client - The IndexerClient instance to set as global
 *
 * @example
 * ```typescript
 * // In app initialization
 * const client = new IndexerClient({ endpoint: 'https://indexer.shinobi.cash/graphql' });
 * setShinobiClient(client);
 *
 * // In a React hook
 * const client = getShinobiClient();
 * const activities = await client.query().activities().execute();
 * ```
 */
export function setShinobiClient(client: IndexerClient): void {
  globalClient = client;
}

/**
 * Get the global IndexerClient instance
 *
 * @returns The global IndexerClient instance
 * @throws Error if no client has been set
 *
 * @example
 * ```typescript
 * const client = getShinobiClient();
 * const activities = await client.query().activities().execute();
 * ```
 */
export function getShinobiClient(): IndexerClient {
  if (!globalClient) {
    throw new Error(
      'No global IndexerClient has been set. Call setShinobiClient() first, typically in your app initialization.'
    );
  }
  return globalClient;
}

/**
 * Check if a global IndexerClient instance has been set
 *
 * @returns True if a global client has been set, false otherwise
 *
 * @example
 * ```typescript
 * if (hasShinobiClient()) {
 *   const client = getShinobiClient();
 *   // use client
 * } else {
 *   console.warn('No client configured');
 * }
 * ```
 */
export function hasShinobiClient(): boolean {
  return globalClient !== null;
}
