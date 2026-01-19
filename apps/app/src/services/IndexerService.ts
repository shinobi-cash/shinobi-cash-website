/**
 * Indexer Service
 * Proxies all indexer queries through Next.js API routes to hide credentials
 */

import { IPFS_GATEWAY_URL } from "@shinobi-cash/constants";
import type { Activity, StateTreeLeaf, ASPApprovalList } from "@shinobi-cash/data";
import { Errors, AppException, logError } from "@/lib/errors";

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
 * Proxied through Next.js API to hide credentials
 */
export async function fetchActivities(
  poolAddress?: string,
  limit = 100,
  after?: string,
  orderDirection: "asc" | "desc" = "desc"
) {
  try {
    const response = await fetch("/api/indexer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "activities",
        params: { poolAddress, limit, after, orderDirection },
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch activities");
    }

    return result.data;
  } catch (error) {
    logError(error, { action: "fetchActivities", poolId: poolAddress });
    throw new AppException(Errors.indexer.fetchFailed("Failed to fetch activities", error));
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
    throw new AppException(Errors.indexer.fetchFailed("Failed to fetch state tree", error));
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
    // If already an AppException, re-throw
    if (error instanceof AppException) {
      throw error;
    }

    logError(error, { action: "fetchLatestASPRoot" });
    throw new AppException(Errors.indexer.fetchFailed("Failed to fetch ASP root", error));
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
      throw new AppException(
        Errors.network.requestFailed(`Failed to fetch from IPFS: ${ipfsResponse.statusText}`)
      );
    }

    const approvalList = (await ipfsResponse.json()) as ASPApprovalListLegacy;

    // Validate the approval list structure
    if (
      !approvalList.cumulativeApprovedLabels ||
      !Array.isArray(approvalList.cumulativeApprovedLabels)
    ) {
      throw new AppException(Errors.indexer.invalidResponse());
    }

    return approvalList.cumulativeApprovedLabels;
  } catch (error) {
    // If already a typed error, re-throw
    if (error instanceof AppException) {
      throw error;
    }

    logError(error, { action: "fetchApprovedLabelsFromIPFS", ipfsCID });
    throw new AppException(
      Errors.network.requestFailed("Failed to fetch approved labels from IPFS", error)
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
    if (error instanceof AppException) {
      throw error;
    }

    logError(error, { action: "fetchASPData" });
    throw new AppException(Errors.indexer.fetchFailed("Failed to fetch ASP data", error));
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
