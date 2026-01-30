import { IPFS_GATEWAY_URL } from "@shinobi-cash/constants";
import type { StateTreeLeaf } from "@shinobi-cash/data";
import { Errors, AppError, logError } from "@/lib/errors/errors";
import { AuthController } from "@/controllers/AuthController";

/**
 * Check if user is authenticated
 * Guards all indexer calls to prevent unauthenticated API requests
 */
function isAuthenticated(): boolean {
  return AuthController.state.state.status === "authenticated";
}

/**
 * Assert authenticated or throw
 */
function assertAuthenticated() {
  if (!isAuthenticated()) {
    throw Errors.auth.failed("Not authenticated");
  }
}

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

/**
 * Internal fetch activities - no auth check
 * Used by web workers which can't access main thread auth state
 * Worker lifecycle is managed by AppRuntime (only runs when authenticated)
 */
async function fetchActivitiesInternal(
  poolAddress?: string,
  limit = 100,
  offset?: number,
  orderDirection: "asc" | "desc" = "desc"
) {
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
}

export async function fetchActivities(
  poolAddress?: string,
  limit = 100,
  offset?: number,
  orderDirection: "asc" | "desc" = "desc"
) {
  assertAuthenticated();
  try {
    return await fetchActivitiesInternal(poolAddress, limit, offset, orderDirection);
  } catch (error) {
    logError(error, { action: "fetchActivities", poolId: poolAddress });
    throw Errors.indexer.fetchFailed("Failed to fetch activities", error);
  }
}


export async function fetchStateTreeLeaves(poolId: string): Promise<StateTreeLeaf[]> {
  assertAuthenticated();
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
    throw Errors.indexer.fetchFailed("Failed to fetch state tree", error);
  }
}

export async function fetchLatestASPRoot(): Promise<{
  root: string;
  ipfsCID: string;
  timestamp: string;
}> {
  assertAuthenticated();
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
    if (error instanceof AppError) throw error;
    logError(error, { action: "fetchLatestASPRoot" });
    throw Errors.indexer.fetchFailed("Failed to fetch ASP root", error);
  }
}

export async function fetchApprovedLabelsFromIPFS(ipfsCID: string): Promise<string[]> {
  assertAuthenticated();
  try {
    const ipfsResponse = await fetch(`${IPFS_GATEWAY_URL}${ipfsCID}`);

    if (!ipfsResponse.ok) {
      throw Errors.network.requestFailed(`Failed to fetch from IPFS: ${ipfsResponse.statusText}`);
    }

    const approvalList = (await ipfsResponse.json()) as IPFSApprovalList;

    if (
      !approvalList.cumulativeApprovedLabels ||
      !Array.isArray(approvalList.cumulativeApprovedLabels)
    ) {
      throw Errors.indexer.invalidResponse();
    }

    return approvalList.cumulativeApprovedLabels;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logError(error, { action: "fetchApprovedLabelsFromIPFS", ipfsCID });
    throw Errors.network.requestFailed("Failed to fetch approved labels from IPFS", error);
  }
}

export async function fetchASPData() {
  try {
    const { root, ipfsCID, timestamp } = await fetchLatestASPRoot();
    const approvalList = await fetchApprovedLabelsFromIPFS(ipfsCID);
    return { root, ipfsCID, timestamp, approvalList };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logError(error, { action: "fetchASPData" });
    throw Errors.indexer.fetchFailed("Failed to fetch ASP data", error);
  }
}

export async function checkIndexerHealth(): Promise<boolean> {
  if (!isAuthenticated()) {
    return false;
  }
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

export async function fetchLatestIndexedBlock(): Promise<{
  blockNumber: string;
  timestamp: string;
} | null> {
  if (!isAuthenticated()) {
    return null;
  }
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
    logError(error, { action: "fetchLatestIndexedBlock" });
    return null;
  }
}

export async function checkIndexerResponsive(): Promise<boolean> {
  return checkIndexerHealth();
}
