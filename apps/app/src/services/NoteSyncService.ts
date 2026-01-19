import { fetchActivities } from "@/services/IndexerService";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { repositoryRegistry } from "@/lib/storage/RepositoryRegistry";

export async function initializeSyncBaseline(
  publicKey: string,
  poolAddress: string = SHINOBI_CASH_ETH_POOL.address
): Promise<void> {
  try {
    const result = await fetchActivities(poolAddress, 1, undefined, "desc");
    const cursor = result.pageInfo.endCursor;

    await repositoryRegistry.notesRepo.storeData(publicKey, poolAddress, [], -1, cursor);
  } catch (err) {
    console.warn("Sync baseline init failed, falling back to full scan", err);
  }
}
