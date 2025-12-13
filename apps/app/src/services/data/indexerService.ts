/**
 * Indexer Service
 */

import { IPFS_GATEWAY_URL, SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { getShinobiClient } from "@shinobi-cash/data";
import type { Activity, StateTreeLeaf, ASPApprovalList } from "@shinobi-cash/data";
import {
  IndexerError,
  INDEXER_ERROR_CODES,
  NetworkError,
  NETWORK_ERROR_CODES,
  logError,
} from "@/lib/errors";

// Re-export SDK types for compatibility
export type { Activity, StateTreeLeaf, ASPApprovalList };

// Pagination response type matching SDK's PageInfo structure
export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    endCursor?: string;
  };
}

// ============ LOCAL TYPES ============

export type ActivityType = "DEPOSIT" | "WITHDRAWAL" | "RAGEQUIT";
export type ActivityStatus = "pending" | "approved" | "rejected";

// ============ LEGACY COMPATIBILITY TYPES ============

// Legacy interface for compatibility
export interface ASPApprovalListLegacy {
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
 * Uses SDK's proper pagination handling
 */
export async function fetchActivities(
  poolAddress?: string,
  limit = 100,
  after?: string,
  orderDirection: "asc" | "desc" = "desc",
) {
  try {
    const poolId = (poolAddress || SHINOBI_CASH_ETH_POOL.address).toLowerCase();
    const client = getShinobiClient();

    // Use SDK's getActivities method which properly handles pagination
    const response = await client.getActivities({
      poolId,
      limit,
      orderDirection,
      after,
    });

    console.log('[fetchActivities] Response:', {
      itemCount: response.items.length,
      limit,
      hasNextPage: response.pageInfo.hasNextPage,
      firstItem: response.items[0]?.type,
      orderDirection,
    });

    return response;
  } catch (error) {
    logError(error, { action: "fetchActivities", poolId: poolAddress });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch activities from indexer",
      {
        cause: error,
        context: { poolAddress, limit, orderDirection },
      },
    );
  }
}

// ============ STATE TREE QUERIES ============

/**
 * Fetch all state tree commitments ordered by leafIndex (with automatic pagination)
 * Uses SDK client which handles pagination internally
 */
export async function fetchStateTreeLeaves(poolId: string): Promise<StateTreeLeaf[]> {
  try {
    // Use SDK's convenience method that handles pagination automatically
    const client = getShinobiClient();
    return await client.getAllStateTreeLeaves(poolId);
  } catch (error) {
    logError(error, { action: "fetchStateTreeLeaves", poolId });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch state tree data from indexer",
      {
        cause: error,
        context: { poolId },
      },
    );
  }
}

// ============ ASP (APPROVED SET OF PARTICIPANTS) QUERIES ============

/**
 * Fetch latest ASP root and IPFS CID from indexer
 * Uses SDK's getLatestASPRoot method
 */
export async function fetchLatestASPRoot(): Promise<{ root: string; ipfsCID: string; timestamp: string }> {
  try {
    const client = getShinobiClient();

    // Use SDK's getLatestASPRoot method
    const latestUpdate = await client.getLatestASPRoot();

    console.log('[fetchLatestASPRoot] Result:', latestUpdate);

    if (!latestUpdate?.root || !latestUpdate?.ipfsCID) {
      throw new IndexerError(
        INDEXER_ERROR_CODES.INVALID_RESPONSE,
        "No ASP root found or missing IPFS CID",
        { context: { latestUpdate } },
      );
    }

    return {
      root: latestUpdate.root,
      ipfsCID: latestUpdate.ipfsCID,
      timestamp: latestUpdate.timestamp.toString(),
    };
  } catch (error) {
    // If already an IndexerError, re-throw
    if (error instanceof IndexerError) {
      throw error;
    }

    logError(error, { action: "fetchLatestASPRoot" });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch ASP root from indexer",
      { cause: error },
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
        },
      );
    }

    const approvalList = (await ipfsResponse.json()) as ASPApprovalListLegacy;

    // Validate the approval list structure
    if (!approvalList.cumulativeApprovedLabels || !Array.isArray(approvalList.cumulativeApprovedLabels)) {
      throw new IndexerError(
        INDEXER_ERROR_CODES.INVALID_RESPONSE,
        "Invalid approval list format from IPFS",
        { context: { ipfsCID, approvalList } },
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
      { cause: error, context: { ipfsCID } },
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

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch ASP data",
      { cause: error },
    );
  }
}

// ============ POOL QUERIES ============

/**
 * Fetch pool statistics (total deposits, withdrawals, deposit count)
 * Uses SDK's getPoolStats method
 */
export async function fetchPoolStats(poolAddress?: string): Promise<{
  totalDeposits: string;
  totalWithdrawals: string;
  depositCount: number;
  createdAt: string;
} | null> {
  try {
    const poolId = (poolAddress || SHINOBI_CASH_ETH_POOL.address).toLowerCase();
    const client = getShinobiClient();

    // Use SDK's getPoolStats method
    const pool = await client.getPoolStats(poolId);

    console.log('[fetchPoolStats] Result:', pool);

    if (!pool) return null;

    // Convert BigInt values to strings
    return {
      totalDeposits: pool.totalDeposits.toString(),
      totalWithdrawals: pool.totalWithdrawals.toString(),
      depositCount: Number(pool.depositCount),
      createdAt: pool.createdAt.toString(),
    };
  } catch (error) {
    logError(error, { action: "fetchPoolStats", poolAddress });

    throw new IndexerError(
      INDEXER_ERROR_CODES.FETCH_FAILED,
      "Failed to fetch pool statistics",
      {
        cause: error,
        context: { poolAddress },
      },
    );
  }
}

/**
 * Get pool configuration and stats
 * Uses the Shinobi Indexer SDK consistently
 */
export async function fetchPoolConfig(poolId: string) {
  try {
    const client = getShinobiClient();
    // SDK uses getPoolStats for pool config data
    const result = await client.getPoolStats(poolId);

    if (!result) return null;

    // Return with bigint fields converted to strings/numbers
    return {
      id: result.id,
      totalDeposits: result.totalDeposits.toString(),
      totalWithdrawals: result.totalWithdrawals.toString(),
      depositCount: Number(result.depositCount),
      createdAt: result.createdAt.toString(),
    };
  } catch (error) {
    // Log but return null (non-critical, has fallback behavior)
    logError(error, { action: "fetchPoolConfig", poolId });
    return null;
  }
}

// ============ HEALTH CHECK QUERIES ============

/**
 * Simple health check using SDK
 * Uses SDK client for consistency
 */
export async function checkIndexerHealth(): Promise<boolean> {
  try {
    const client = getShinobiClient();
    const health = await client.healthCheck();
    return health.status === "ok" || health.status === "healthy";
  } catch (error) {
    return false;
  }
}

/**
 * Get latest indexed block from Ponder meta status
 * Returns actual block data for transaction tracking
 */
export async function fetchLatestIndexedBlock(): Promise<{
  blockNumber: string;
  timestamp: string;
} | null> {
  try {
    const client = getShinobiClient();
    const latestBlock = await client.getLatestIndexedBlock();
    return latestBlock;
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
