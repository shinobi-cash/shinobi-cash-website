import type { ShinobiIndexer } from "@shinobi-cash/client";
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

async function fetchActivities(poolAddress?: string, limit = 100, offset?: number) {
  assertAuthenticated();
  try {
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
  } catch (error) {
    logError(error, { action: "fetchActivities", poolId: poolAddress });
    throw Errors.indexer.fetchFailed("Failed to fetch activities", error);
  }
}

async function fetchStateTreeLeaves(poolId: string): Promise<StateTreeLeaf[]> {
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

async function fetchASPRootInfo(): Promise<{ aspRoot: string; ipfsCid: string } | null> {
  assertAuthenticated();
  try {
    const response = await fetch("/api/indexer/asp-root");
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch ASP root info");
    }

    return result.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logError(error, { action: "fetchASPRootInfo" });
    throw Errors.indexer.fetchFailed("Failed to fetch ASP root info", error);
  }
}

export function createShinobiIndexer(): ShinobiIndexer {
  return {
    async getStateTree(poolAddress: string) {
      const leaves = await fetchStateTreeLeaves(poolAddress);
      return { leaves };
    },
    async getASPRootInfo() {
      return fetchASPRootInfo();
    },
    async getActivities(pool, limit, offset) {
      const result = await fetchActivities(pool, limit, offset);
      return { items: result.items, pageInfo: result.pageInfo };
    },
  };
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
