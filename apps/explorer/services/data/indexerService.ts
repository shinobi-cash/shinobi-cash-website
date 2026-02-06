/**
 * Indexer Service
 * Proxies all indexer queries through Next.js API routes to hide credentials
 */

import { IPFS_GATEWAY_URL } from "@shinobi-cash/constants";
import type { StateTreeLeaf } from "@shinobi-cash/data";
import {
  IndexerError,
  INDEXER_ERROR_CODES,
  NetworkError,
  NETWORK_ERROR_CODES,
  logError,
} from "@/lib/errors";

// Re-export ActivityType for components that need it
export type { ActivityType } from "@shinobi-cash/data";

/**
 * IPFS approval list structure (format stored in IPFS)
 */
interface IPFSApprovalList {
  version: "1.0";
  poolId: string;
  cumulativeApprovedLabels: string[];
  aspRoot: string;
  timestamp: number;
  description: string;
}

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
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "activities",
        params: { poolAddress, limit, offset, orderDirection },
      }),
    });

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

// ============ STATE TREE QUERIES ============

/**
 * Fetch all state tree commitments ordered by leafIndex (with automatic pagination)
 * Proxied through Next.js API to hide credentials
 */
export async function fetchStateTreeLeaves(poolId: string): Promise<StateTreeLeaf[]> {
  try {
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "stateTree",
        params: { poolId },
      }),
    });

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

// ============ ASP (APPROVED SET OF PARTICIPANTS) QUERIES ============

/**
 * Fetch latest ASP root and IPFS CID from indexer
 * Proxied through Next.js API to hide credentials
 */
export async function fetchLatestASPRoot(): Promise<{
  root: string;
  ipfsCID: string;
  timestamp: string;
}> {
  try {
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "aspRoot",
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch ASP root");
    }

    return result.data;
  } catch (error) {
    // If already an IndexerError, re-throw
    if (error instanceof IndexerError) {
      throw error;
    }

    logError(error, { action: "fetchLatestASPRoot" });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch ASP root from indexer",
      { cause: error }
    );
  }
}

/**
 * Fetch approved labels from IPFS using CID
 * Direct IPFS fetch - no SDK equivalent needed
 */
export async function fetchApprovedLabelsFromIPFS(ipfsCID: string): Promise<string[]> {
  try {
    const ipfsResponse = await fetch(`${IPFS_GATEWAY_URL}${ipfsCID}`);

    if (!ipfsResponse.ok) {
      throw new NetworkError(
        NETWORK_ERROR_CODES.REQUEST_FAILED,
        `Failed to fetch from IPFS: ${ipfsResponse.statusText}`,
        {
          context: {
            ipfsCID,
            status: ipfsResponse.status,
            statusText: ipfsResponse.statusText,
          },
        }
      );
    }

    const approvalList = (await ipfsResponse.json()) as IPFSApprovalList;

    // Validate the approval list structure
    if (
      !approvalList.cumulativeApprovedLabels ||
      !Array.isArray(approvalList.cumulativeApprovedLabels)
    ) {
      throw new IndexerError(
        INDEXER_ERROR_CODES.INVALID_RESPONSE,
        "Invalid approval list format from IPFS",
        { context: { ipfsCID, approvalList } }
      );
    }

    return approvalList.cumulativeApprovedLabels;
  } catch (error) {
    // If already a typed error, re-throw
    if (error instanceof NetworkError || error instanceof IndexerError) {
      throw error;
    }

    logError(error, { action: "fetchApprovedLabelsFromIPFS", ipfsCID });

    throw new NetworkError(
      NETWORK_ERROR_CODES.REQUEST_FAILED,
      "Failed to fetch approved labels from IPFS",
      { cause: error, context: { ipfsCID } }
    );
  }
}

/**
 * Orchestrates fetching ASP root from indexer and approval list from IPFS
 * Fetches approved labels directly from IPFS for most up-to-date data
 */
export async function fetchASPData() {
  try {
    // Step 1: Get latest ASP root and IPFS CID from indexer
    const { root, ipfsCID, timestamp } = await fetchLatestASPRoot();

    // Step 2: Fetch approval list directly from IPFS using the CID
    const approvalList = await fetchApprovedLabelsFromIPFS(ipfsCID);

    return {
      root,
      ipfsCID,
      timestamp,
      approvalList,
    };
  } catch (error) {
    // Re-throw typed errors (they already have good messages)
    if (error instanceof IndexerError || error instanceof NetworkError) {
      throw error;
    }

    logError(error, { action: "fetchASPData" });

    throw new IndexerError(INDEXER_ERROR_CODES.FETCH_FAILED, "Failed to fetch ASP data", {
      cause: error,
    });
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
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "poolStats",
        params: { poolAddress },
      }),
    });

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
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "poolConfig",
        params: { poolId },
      }),
    });

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

// ============ HEALTH CHECK QUERIES ============

/**
 * Simple health check
 * Proxied through Next.js API to hide credentials
 */
export async function checkIndexerHealth(): Promise<boolean> {
  try {
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "health",
      }),
    });

    const result = await response.json();
    return result.success && result.data?.status === true;
  } catch {
    return false;
  }
}

/**
 * Get latest indexed block from Ponder meta status
 * Returns actual block data for transaction tracking
 * Proxied through Next.js API to hide credentials
 */
export async function fetchLatestIndexedBlock(): Promise<{
  blockNumber: string;
  timestamp: string;
} | null> {
  try {
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "latestBlock",
      }),
    });

    const result = await response.json();

    if (!result.success || !result.data) {
      return null;
    }

    return result.data;
  } catch (error) {
    // Log but return null (non-critical, used for monitoring)
    logError(error, { action: "fetchLatestIndexedBlock" });
    return null;
  }
}

/**
 * Check if indexer is responsive for transaction tracking
 * Simple check that returns true if indexer responds, false otherwise
 */
export async function checkIndexerResponsive(): Promise<boolean> {
  return checkIndexerHealth();
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
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "intents",
        params: {
          limit,
          offset,
          orderDirection,
          ...filters,
        },
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch intents");
    }

    return result.data;
  } catch (error) {
    logError(error, { action: "fetchIntents", filters });

    throw new IndexerError(INDEXER_ERROR_CODES.FETCH_FAILED, "Failed to fetch intents from indexer", {
      cause: error,
      context: { limit, offset, orderDirection, filters },
    });
  }
}

/**
 * Fetch intent details including full timeline
 * Proxied through Next.js API to hide credentials
 */
export async function fetchIntentDetails(orderId: string) {
  try {
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "intentDetails",
        params: { orderId },
      }),
    });

    const result = await response.json();

    if (!result.success) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(result.error || "Failed to fetch intent details");
    }

    return result.data;
  } catch (error) {
    // If already an IndexerError, re-throw
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
