/**
 * Note Discovery Service
 *
 * Uses NotesRepository with core primitives for note discovery
 */

import { storageManager } from "@/lib/storage";
import { fetchActivities } from "@/services/data/indexerService";
import type { DiscoveryResult, DiscoveryOptions } from "@shinobi-cash/core";

/**
 * Discover notes for an account
 *
 * Now uses NoteSyncEngine for cleaner architecture.
 *
 * @param publicKey - User's public key/address
 * @param poolAddress - Pool contract address
 * @param accountKey - Account key for cryptographic derivation
 * @param options - Discovery options (progress callback, abort signal)
 * @returns Discovery result with found notes
 */
export async function discoverNotes(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint,
  options?: DiscoveryOptions
): Promise<DiscoveryResult> {
  console.log('[NoteDiscoveryService] Using NoteSyncEngine');

  return storageManager.discoverNotes(
    publicKey,
    poolAddress,
    accountKey,
    async (poolAddress: string, limit: number, cursor?: string, orderDirection?: 'asc' | 'desc') => {
      const result = await fetchActivities(poolAddress, limit, cursor, orderDirection);
      return {
        items: result.items,
        pageInfo: result.pageInfo,
      };
    },
    options
  );
}

// Export wrapper object to maintain compatibility with existing hook
export const noteDiscoveryService = {
  discoverNotes,
};

// Also maintain compatibility with noteStorageProvider
export const noteStorageProvider = storageManager;

export default noteDiscoveryService;
