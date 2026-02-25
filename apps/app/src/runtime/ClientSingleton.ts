/**
 * ClientSingleton — Module-level singleton for ShinobiCashClient.
 *
 * Created alongside ShinobiAccount at auth time, destroyed on logout.
 * All chain interaction operations go through getShinobiClient().
 */

import { createShinobiCashClient, type ShinobiCashClient, type ClientIndexer } from "@shinobi-cash/client";
import type { ShinobiAccount } from "@shinobi-cash/core/account";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { BUNDLER_URL } from "@/config/constants";
import { fetchStateTreeLeaves, fetchASPData, fetchActivities } from "@/utils/indexer";
import { notesRepo } from "@/lib/storage/repositories/NotesRepository";

let client: ShinobiCashClient | null = null;

export function getShinobiClient(): ShinobiCashClient {
  if (!client) throw new Error("ShinobiCashClient not initialized");
  return client;
}

/**
 * Adapter: bridges app's indexer proxy routes to ClientIndexer interface
 */
const indexer: ClientIndexer = {
  async getStateTree(poolAddress: string) {
    const leaves = await fetchStateTreeLeaves(poolAddress);
    return { leaves };
  },
  async getApprovedLabels() {
    const data = await fetchASPData();
    return data.approvalList;
  },
  async getActivities(pool, limit, offset) {
    const result = await fetchActivities(pool, limit, offset);
    return { items: result.items, pageInfo: result.pageInfo };
  },
};

export function createClient(account: ShinobiAccount): ShinobiCashClient {
  client = createShinobiCashClient({
    account,
    poolAddress: SHINOBI_CASH_ETH_POOL.address as `0x${string}`,
    indexer,
    bundlerUrl: BUNDLER_URL,
    solverUrl: "/api/solver/quote",
    persistence: notesRepo.getPersistenceCallbacks(),
  });
  return client;
}

export function destroyClient(): void {
  client = null;
}
