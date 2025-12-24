/**
 * Note Discovery Hook
 * Handles note scanning and discovery
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { noteDiscoveryService, noteStorageProvider } from "@/lib/services/NoteDiscoveryService";
import type { DiscoveryResult } from "@/lib/storage/types";
import type { DiscoveryProgress } from "@shinobi-cash/core";

interface DiscoveryState {
  data: DiscoveryResult | null;
  isDiscovering: boolean;
  error: string | null;
  progress: DiscoveryProgress | null;
}

export function useNoteDiscovery(
  publicKey: string,
  poolAddress: string,
  accountKey: bigint,
  autoScan: boolean = true
) {
  const [state, setState] = useState<DiscoveryState>({
    data: null,
    isDiscovering: true,
    error: null,
    progress: null,
  });

  const refreshIdRef = useRef(0);

  const runDiscovery = useCallback(
    async (signal?: AbortSignal, onProgress?: (p: DiscoveryProgress) => void) => {
      return noteDiscoveryService.discoverNotes(publicKey, poolAddress, accountKey, {
        signal,
        onProgress,
      });
    },
    [publicKey, poolAddress, accountKey]
  );

  useEffect(() => {
    if (!publicKey || !accountKey) {
      setState((prev) => ({ ...prev, isDiscovering: false }));
      return;
    }

    const runId = ++refreshIdRef.current;
    let hasCachedData = false;

    // Load cache first
    const loadCache = async () => {
      try {
        const cached = await noteStorageProvider.getCachedNotes(publicKey, poolAddress);
        if (cached && runId === refreshIdRef.current) {
          setState((prev) => ({
            ...prev,
            data: cached,
            isDiscovering: false,
          }));
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
      if (runId === refreshIdRef.current) {
        setState((prev) => ({ ...prev, progress: p }));
      }
    };

    // Start background discovery
    runDiscovery(signal, onProgress)
      .then((result) => {
        if (runId === refreshIdRef.current) {
          setState((prev) => ({
            ...prev,
            data: result,
            error: null,
            isDiscovering: false,
          }));
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (runId === refreshIdRef.current) {
          const errorMessage = err instanceof Error ? err.message : "Discovery failed";
          setState((prev) => ({
            ...prev,
            error: hasCachedData ? null : errorMessage,
            isDiscovering: false,
          }));
          console.warn("Note discovery failed:", err);
        }
      });

    return () => controller.abort();
  }, [publicKey, poolAddress, accountKey, autoScan, runDiscovery]);

  const refresh = useCallback(async () => {
    const runId = ++refreshIdRef.current;
    const controller = new AbortController();
    const signal = controller.signal;

    // Only show loading during refresh if we have no data
    if (!state.data) {
      setState((prev) => ({ ...prev, isDiscovering: true }));
    }
    setState((prev) => ({ ...prev, error: null }));

    const onProgress = (p: DiscoveryProgress) => {
      if (runId === refreshIdRef.current) {
        setState((prev) => ({ ...prev, progress: p }));
      }
    };

    try {
      const result = await runDiscovery(signal, onProgress);
      if (runId === refreshIdRef.current) {
        setState((prev) => ({
          ...prev,
          data: result,
          error: null,
          isDiscovering: false,
        }));
      }
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (runId === refreshIdRef.current) {
        const errorMessage = err instanceof Error ? err.message : "Refresh failed";
        setState((prev) => ({
          ...prev,
          error: state.data ? null : errorMessage,
          isDiscovering: false,
        }));
        console.warn("Note refresh failed:", err);
      }
      throw err;
    }
  }, [runDiscovery, state.data]);

  return {
    data: state.data,
    isDiscovering: state.isDiscovering,
    discoveryError: state.error,
    progress: state.progress,
    refresh,
  };
}
