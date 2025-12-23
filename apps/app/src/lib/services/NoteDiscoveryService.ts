/**
 * Note Discovery Service
 *
 * Migrated to use @shinobi-cash/core SDK
 * Original implementation backed up to NoteDiscoveryService.ts.backup
 * Migrated: 2025-01-06
 */

import { NoteDiscoveryService, type ActivityFetcher } from "@shinobi-cash/core";
import { StorageProviderAdapter } from "./adapters/StorageProviderAdapter";
import { fetchActivities } from "@/services/data/indexerService";

/**
 * Create adapter function to bridge mini-app's fetchActivities to SDK's ActivityFetcher interface
 *
 * The SDK expects an ActivityFetcher function with a specific signature.
 * This adapter converts our existing fetchActivities to match that interface.
 */
const activityFetcher: ActivityFetcher = async (
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
};

/**
 * Create singleton service instance with storage adapter and activity fetcher
 */
export const noteStorageProvider = new StorageProviderAdapter();
export const noteDiscoveryService = new NoteDiscoveryService(noteStorageProvider, activityFetcher);

// Export singleton as default
export default noteDiscoveryService;
