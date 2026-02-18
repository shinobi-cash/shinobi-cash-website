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
 * Internal fetch activities - no auth check
 * Used by web workers which can't access main thread auth state
 * Worker lifecycle is managed by AppRuntime (only runs when authenticated)
 */
async function fetchActivitiesInternal(
  poolAddress?: string,
  limit = 100,
  offset?: number
) {
  const params = new URLSearchParams();
  if (poolAddress) params.set("pool", poolAddress);
  params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));

  const response = await fetch(`/api/indexer/activities?${params}`);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch activities");
  }

  return result.data;
}

export async function fetchActivities(
  poolAddress?: string,
  limit = 100,
  offset?: number
) {
  assertAuthenticated();
  try {
    return await fetchActivitiesInternal(poolAddress, limit, offset);
  } catch (error) {
    logError(error, { action: "fetchActivities", poolId: poolAddress });
    throw Errors.indexer.fetchFailed("Failed to fetch activities", error);
  }
}

export async function fetchStateTreeLeaves(poolId: string): Promise<StateTreeLeaf[]> {
  assertAuthenticated();
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
    throw Errors.indexer.fetchFailed("Failed to fetch state tree", error);
  }
}

/**
 * Fetch ASP approved labels directly from indexer
 * No longer needs IPFS - labels are stored in database
 */
export async function fetchASPData(): Promise<{ approvalList: string[] }> {
  assertAuthenticated();
  try {
    const response = await fetch("/api/indexer/asp-labels");
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch ASP labels");
    }

    return { approvalList: result.data.labels };
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
    const response = await fetch("/api/indexer/health");
    const result = await response.json();
    return result.success && result.data?.status === true;
  } catch (error) {
    logError(error, { action: "checkIndexerHealth" });
    return false;
  }
}
