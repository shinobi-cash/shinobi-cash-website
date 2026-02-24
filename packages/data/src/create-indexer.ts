import type {
  IndexerClientOptions,
  ActivityFilters,
  PaginationOptions,
  PaginatedResponse,
  ActivityItem,
  ActivityDetailResponse,
  StatsFilters,
  StatsResponse,
  StateTreeLeaf,
  IntentFilters,
  Intent,
  Pool,
} from "./types";
import type { ASPRootInfo } from "./client/asp";
import { ActivityClient } from "./client/activity";
import { StatsClient } from "./client/stats";
import { StateTreeClient } from "./client/state-tree";
import { IntentClient } from "./client/intent";
import { PoolClient } from "./client/pool";
import { ASPClient } from "./client/asp";

export type Indexer = {
  /** Health check — returns true if indexer is reachable */
  health(): Promise<boolean>;

  // Activity
  getActivities(
    filters?: ActivityFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<ActivityItem>>;
  getActivityByTxHash(txHash: string): Promise<ActivityDetailResponse | null>;
  getAllActivities(filters?: ActivityFilters): Promise<ActivityItem[]>;

  // Stats
  getStats(filters?: StatsFilters): Promise<StatsResponse>;

  // State Tree
  getStateTree(
    pool: string,
    batchSize?: number
  ): Promise<{ merkleRoot: string | null; treeSize: string; leaves: StateTreeLeaf[] }>;

  // Intents
  getIntents(
    filters?: IntentFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<Intent>>;
  getIntent(orderId: string): Promise<Intent | null>;

  // Pools
  getPools(pagination?: PaginationOptions): Promise<PaginatedResponse<Pool>>;
  getPool(address: string): Promise<Pool | null>;

  // ASP
  getApprovedLabels(): Promise<string[]>;
  getLatestASPRoot(): Promise<ASPRootInfo | null>;
};

const DEFAULT_TIMEOUT = 30000;

/**
 * Create an indexer client with a flat, discoverable API.
 *
 * @example
 * ```ts
 * const indexer = createIndexer({ endpoint: 'https://indexer.shinobi.cash' });
 * await indexer.health();
 * const activities = await indexer.getActivities({ pool: '0x...' });
 * const tree = await indexer.getStateTree('0xpool...');
 * ```
 */
export function createIndexer(options: IndexerClientOptions): Indexer {
  const endpoint = options.endpoint.replace(/\/$/, "");
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const config = { endpoint, authToken: options.authToken, timeout };

  const activity = new ActivityClient(config);
  const stats = new StatsClient(config);
  const stateTree = new StateTreeClient(config);
  const intent = new IntentClient(config);
  const pool = new PoolClient(config);
  const asp = new ASPClient(config);

  return {
    async health() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(`${endpoint}/v2/health`, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    },

    getActivities: (filters, pagination) => activity.fetch(filters, pagination),
    getActivityByTxHash: (txHash) => activity.getByTxHash(txHash),
    getAllActivities: (filters) => activity.fetchAll(filters),
    getStats: (filters) => stats.fetch(filters),
    getStateTree: (poolAddr, batchSize) => stateTree.fetchAll(poolAddr, batchSize),
    getIntents: (filters, pagination) => intent.fetch(filters, pagination),
    getIntent: (orderId) => intent.getById(orderId),
    getPools: (pagination) => pool.fetch(pagination),
    getPool: (address) => pool.getByAddress(address),
    getApprovedLabels: () => asp.fetchAllApprovedLabels(),
    getLatestASPRoot: () => asp.fetchLatestASPRoot(),
  };
}
