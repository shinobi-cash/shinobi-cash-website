import { useState, useEffect, useCallback } from "react";
import { useAutoSync } from "@/hooks/useAutoSync";

interface UseSyncIndicatorParams {
  onSync: () => void | Promise<void>;
  autoSyncInterval: number;
}

export function useSyncIndicator({ onSync, autoSyncInterval }: UseSyncIndicatorParams) {
  const { autoSyncEnabled } = useAutoSync();

  const [timeLeft, setTimeLeft] = useState(autoSyncInterval);
  const [isSyncing, setIsSyncing] = useState(false);

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
      setTimeLeft(autoSyncInterval);
    }
  }, [isSyncing, onSync, autoSyncInterval]);

  // Reset timer when auto-sync toggles
  useEffect(() => {
    setTimeLeft(autoSyncInterval);
  }, [autoSyncEnabled, autoSyncInterval]);

  // Countdown
  useEffect(() => {
    if (!autoSyncEnabled || isSyncing) return;

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          triggerSync();
          return autoSyncInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [autoSyncEnabled, isSyncing, autoSyncInterval, triggerSync]);

  return {
    autoSyncEnabled,
    isSyncing,
    timeLeft,
    progress: (timeLeft / autoSyncInterval) * 100,
    triggerSync,
  };
}
