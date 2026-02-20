/**
 * Indexer Service
 * Proxies all indexer queries through Next.js API routes to hide credentials
 */

import type { StateTreeLeaf, ActivityItem, TimelineEvent } from "@shinobi-cash/data";
import { IndexerError, INDEXER_ERROR_CODES, logError } from "@/lib/errors";

// Re-export types for components that need them
export type { ActivityType, ActivityItem, TimelineEvent } from "@shinobi-cash/data";

// ============ ACTIVITY QUERIES ============

/**
 * Get all activities with pagination support
 * Proxied through Next.js API to hide credentials
 */
export async function fetchActivities(
  poolAddress?: string,
  limit = 100,
  offset?: number,
  orderDirection: "asc" | "desc" = "desc"
) {
  try {
    const params = new URLSearchParams();
    if (poolAddress) params.set("pool", poolAddress);
    params.set("limit", String(limit));
    if (offset !== undefined) params.set("offset", String(offset));
    params.set("orderDirection", orderDirection);

    const response = await fetch(`/api/indexer/activities?${params}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch activities");
    }

    return result.data;
  } catch (error) {
    logError(error, { action: "fetchActivities", poolId: poolAddress });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch activities from indexer",
      {
        cause: error,
        context: { poolAddress, limit, orderDirection },
      }
    );
  }
}

/**
 * Get activity details by txHash including timeline
 * Proxied through Next.js API to hide credentials
 */
export async function fetchActivityDetails(txHash: string): Promise<{
  activity: ActivityItem;
  timeline: TimelineEvent[] | null;
} | null> {
  try {
    const response = await fetch(`/api/indexer/activities/${txHash.toLowerCase()}`);

    if (response.status === 404) {
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch activity details");
    }

    return result.data;
  } catch (error) {
    logError(error, { action: "fetchActivityDetails", txHash });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch activity details from indexer",
      {
        cause: error,
        context: { txHash },
      }
    );
  }
}

// ============ STATE TREE QUERIES ============

/**
 * Fetch all state tree commitments ordered by leafIndex (with automatic pagination)
 * Proxied through Next.js API to hide credentials
 */
export async function fetchStateTreeLeaves(poolId: string): Promise<StateTreeLeaf[]> {
  try {
    const params = new URLSearchParams();
    params.set("poolId", poolId);

    const response = await fetch(`/api/indexer/state-tree?${params}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch state tree");
    }

    return result.data;
  } catch (error) {
    logError(error, { action: "fetchStateTreeLeaves", poolId });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch state tree data from indexer",
      {
        cause: error,
        context: { poolId },
      }
    );
  }
}

// ============ POOL QUERIES ============

/**
 * Crosschain stats for a single chain
 */
export interface CrosschainChainStats {
  count: number;
  totalAmount: string;
}

/**
 * Pool statistics response
 */
export interface PoolStats {
  totalDeposits: string;
  totalWithdrawals: string;
  depositCount: number;
  withdrawalCount: number;
  uniqueDepositors: number;
  crosschainDepositsByChain: Record<string, CrosschainChainStats>;
  crosschainWithdrawalsByChain: Record<string, CrosschainChainStats>;
  ragequitCount: number;
  totalRagequitAmount: string;
  createdAt: string;
}

/**
 * Fetch pool statistics (total deposits, withdrawals, deposit count, etc.)
 * Proxied through Next.js API to hide credentials
 */
export async function fetchPoolStats(poolAddress?: string): Promise<PoolStats | null> {
  try {
    const params = new URLSearchParams();
    if (poolAddress) params.set("pool", poolAddress);

    const response = await fetch(`/api/indexer/pool-stats?${params}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch pool stats");
    }

    return result.data;
  } catch (error) {
    logError(error, { action: "fetchPoolStats", poolAddress });

    throw new IndexerError(INDEXER_ERROR_CODES.FETCH_FAILED, "Failed to fetch pool statistics", {
      cause: error,
      context: { poolAddress },
    });
  }
}

/**
 * Get pool configuration and stats
 * Proxied through Next.js API to hide credentials
 */
export async function fetchPoolConfig(poolId: string) {
  try {
    const params = new URLSearchParams();
    params.set("poolId", poolId);

    const response = await fetch(`/api/indexer/pool-config?${params}`);
    const result = await response.json();

    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  } catch (error) {
    // Log but return null (non-critical, has fallback behavior)
    logError(error, { action: "fetchPoolConfig", poolId });
    return null;
  }
}

// ============ INTENT QUERIES ============

/**
 * Intent type filter
 */
export type IntentTypeFilter = "DEPOSIT" | "WITHDRAWAL";

/**
 * Intent phase filter
 */
export type IntentPhaseFilter = "CREATED" | "ESCROWED" | "FILLED" | "FINALIZED" | "REFUNDED";

/**
 * Intent filters for querying
 */
export interface IntentFilters {
  intentType?: IntentTypeFilter;
  phase?: IntentPhaseFilter;
  originChainId?: string;
  destinationChainId?: string;
  orderId?: string;
}

/**
 * Fetch intents with pagination and filtering support
 * Proxied through Next.js API to hide credentials
 */
export async function fetchIntents(
  limit = 100,
  offset?: number,
  orderDirection: "asc" | "desc" = "desc",
  filters: IntentFilters = {}
) {
  try {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (offset !== undefined) params.set("offset", String(offset));
    if (filters.intentType) params.set("intentType", filters.intentType);
    if (filters.phase) params.set("phase", filters.phase);

    const response = await fetch(`/api/indexer/intents?${params}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch intents");
    }

    return result.data;
  } catch (error) {
    logError(error, { action: "fetchIntents", filters });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch intents from indexer",
      {
        cause: error,
        context: { limit, offset, orderDirection, filters },
      }
    );
  }
}

/**
 * Fetch intent details including full timeline
 * Proxied through Next.js API to hide credentials
 */
export async function fetchIntentDetails(orderId: string) {
  try {
    const response = await fetch(`/api/indexer/intents/${orderId}`);

    if (response.status === 404) {
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch intent details");
    }

    return result.data;
  } catch (error) {
    if (error instanceof IndexerError) {
      throw error;
    }

    logError(error, { action: "fetchIntentDetails", orderId });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch intent details from indexer",
      {
        cause: error,
        context: { orderId },
      }
    );
  }
}
