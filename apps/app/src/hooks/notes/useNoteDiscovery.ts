/**
 * Note Discovery Hook
 * Provides cache-first note discovery with background scanning
 */

import { noteDiscoveryService, noteStorageProvider } from "@/lib/services/NoteDiscoveryService";
import type { DiscoveryResult } from "@/lib/storage/types";
import type { DiscoveryProgress } from "@shinobi-cash/core";
import { useCallback, useEffect, useRef, useState } from "react";

// Use pre-configured singleton service and storage provider from NoteDiscoveryService.ts
// (already configured with storage provider and activity fetcher)
const discoveryService = noteDiscoveryService;
const storageProvider = noteStorageProvider;

export interface UseNoteDiscoveryResult {
  data: DiscoveryResult | null;
  loading: boolean;
  error: Error | null;
  progress: DiscoveryProgress | null;
  refresh: () => Promise<DiscoveryResult>;
}

export interface UseNoteDiscoveryOptions {
  autoScan?: boolean;
}

/**
 * Hook for note discovery with proper cache-first loading and error handling
 */
export function useNoteDiscovery(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint,
  options?: UseNoteDiscoveryOptions
): UseNoteDiscoveryResult {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null);

  const refreshIdRef = useRef(0);

  const runDiscovery = useCallback(
    async (signal?: AbortSignal, onProgress?: (p: DiscoveryProgress) => void) => {
      return discoveryService.discoverNotes(publicKey, poolAddress, accountKey, {
        signal,
        onProgress,
      });
    },
    [publicKey, poolAddress, accountKey]
  );

  useEffect(() => {
    // Don't run if we don't have valid auth parameters
    if (!publicKey || !accountKey) {
      setLoading(false);
      return;
    }

    const autoScan = options?.autoScan ?? true;
    const runId = ++refreshIdRef.current;
    let hasCachedData = false;

    // Load cache first
    const loadCache = async () => {
      try {
        const cached = await storageProvider.getCachedNotes(publicKey, poolAddress);
        if (cached && runId === refreshIdRef.current) {
          setData(cached);
          setLoading(false); // Stop loading immediately when cache is available
          hasCachedData = true;
        }
      } catch (error) {
        console.error("Failed to load cached notes:", error);
      }
    };

    loadCache();

    if (!autoScan) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const onProgress = (p: DiscoveryProgress) => {
      if (runId === refreshIdRef.current) setProgress(p);
    };

    // Start background discovery
    runDiscovery(signal, onProgress)
      .then((result) => {
        if (runId === refreshIdRef.current) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (runId === refreshIdRef.current) {
          // Only set error if we don't have cached data
          if (!hasCachedData) {
            setError(err as Error);
          }
          console.warn("Note discovery failed:", err);
        }
      })
      .finally(() => {
        if (runId === refreshIdRef.current) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [poolAddress, publicKey, accountKey, options?.autoScan, runDiscovery]);

  const refresh = useCallback(async () => {
    const runId = ++refreshIdRef.current;
    const controller = new AbortController();
    const signal = controller.signal;

    // Only show loading during refresh if we have no data
    if (!data) {
      setLoading(true);
    }
    setError(null);

    const onProgress = (p: DiscoveryProgress) => {
      if (runId === refreshIdRef.current) setProgress(p);
    };

    try {
      const result = await runDiscovery(signal, onProgress);
      if (runId === refreshIdRef.current) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (runId === refreshIdRef.current) {
        // Only show error if we don't have cached data to fall back to
        if (!data) {
          setError(err as Error);
        }
        console.warn("Note refresh failed:", err);
      }
      throw err;
    } finally {
      if (runId === refreshIdRef.current) {
        setLoading(false);
      }
    }
  }, [runDiscovery, data]);

  return { data, loading, error, progress, refresh };
}

/**
 * Legacy hook name for backward compatibility
 */
export { useNoteDiscovery as useNotes };
