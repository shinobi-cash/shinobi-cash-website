import { notesRepo } from "@/lib/storage/RepositoryRegistry";
import { fetchActivities } from "@/services/IndexerService";
import type { DiscoveryResult, DiscoveryOptions } from "@shinobi-cash/core";

export async function discoverNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint,
  options?: DiscoveryOptions
): Promise<DiscoveryResult> {
  return notesRepo.discoverNotes(
    publicKey,
    poolAddress,
    accountKey,
    async (
      poolAddress: string,
      limit: number,
      cursor?: string,
      orderDirection?: "asc" | "desc"
    ) => {
      const result = await fetchActivities(poolAddress, limit, cursor, orderDirection);
      return {
        items: result.items,
        pageInfo: result.pageInfo,
      };
    },
    options
  );
}
