import { IPFS_GATEWAY_URL } from "@shinobi-cash/constants";
import type { Activity, StateTreeLeaf, ASPApprovalList } from "@shinobi-cash/data";
import { Errors, AppException, logError } from "@/lib/errors/errors";

export type { Activity, StateTreeLeaf, ASPApprovalList };

export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    endCursor?: string;
  };
}

export type ActivityType = "DEPOSIT" | "WITHDRAWAL" | "RAGEQUIT";
export type ActivityStatus = "pending" | "approved" | "rejected";

export interface ASPApprovalListLegacy {
  version: "1.0";
  poolId: string;
  cumulativeApprovedLabels: string[];
  aspRoot: string;
  timestamp: number;
  description: string;
}

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
    if (error instanceof AppException) {
      throw error;
    }

    logError(error, { action: "fetchLatestASPRoot" });
    throw new AppException(Errors.indexer.fetchFailed("Failed to fetch ASP root", error));
  }
}

export async function fetchApprovedLabelsFromIPFS(ipfsCID: string): Promise<string[]> {
  try {
    const ipfsResponse = await fetch(`${IPFS_GATEWAY_URL}${ipfsCID}`);

    if (!ipfsResponse.ok) {
      throw new AppException(
        Errors.network.requestFailed(`Failed to fetch from IPFS: ${ipfsResponse.statusText}`)
      );
    }

    const approvalList = (await ipfsResponse.json()) as ASPApprovalListLegacy;

    if (
      !approvalList.cumulativeApprovedLabels ||
      !Array.isArray(approvalList.cumulativeApprovedLabels)
    ) {
      throw new AppException(Errors.indexer.invalidResponse());
    }

    return approvalList.cumulativeApprovedLabels;
  } catch (error) {
    if (error instanceof AppException) throw error;
    logError(error, { action: "fetchApprovedLabelsFromIPFS", ipfsCID });
    throw new AppException(
      Errors.network.requestFailed("Failed to fetch approved labels from IPFS", error)
    );
  }
}

export async function fetchASPData() {
  try {
    const { root, ipfsCID, timestamp } = await fetchLatestASPRoot();
    const approvalList = await fetchApprovedLabelsFromIPFS(ipfsCID);
    return { root, ipfsCID, timestamp, approvalList };
  } catch (error) {
    if (error instanceof AppException) throw error;
    logError(error, { action: "fetchASPData" });
    throw new AppException(Errors.indexer.fetchFailed("Failed to fetch ASP data", error));
  }
}

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
    logError(error, { action: "fetchLatestIndexedBlock" });
    return null;
  }
}

export async function checkIndexerResponsive(): Promise<boolean> {
  return checkIndexerHealth();
}
