/**
 * Cached Notes Hook
 * Provides cached note data with optimized loading
 */

import { repositoryRegistry } from "@/lib/storage/RepositoryRegistry";
import type { DiscoveryResult } from "@shinobi-cash/core";
import { useEffect, useState } from "react";

export function useCachedNotes(publicKey: string, poolAddress: string) {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await repositoryRegistry.notesRepo.getCachedNotes(publicKey, poolAddress);
        setData(cached);
      } catch (error) {
        console.error("Failed to load cached notes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCache();
  }, [publicKey, poolAddress]);

  return { data, loading };
}
