"use client";

import { useSyncIndicator } from "@/hooks/useSyncIndicator";
import { SyncIndicatorView } from "./SyncIndicatorView";

interface SyncIndicatorProps {
  onSync: () => void | Promise<void>;
  autoSyncInterval?: number;
}

export function SyncIndicator({ onSync, autoSyncInterval = 10 }: SyncIndicatorProps) {
  const state = useSyncIndicator({
    onSync,
    autoSyncInterval,
  });

  return (
    <SyncIndicatorView
      autoSyncEnabled={state.autoSyncEnabled}
      isSyncing={state.isSyncing}
      timeLeft={state.timeLeft}
      progress={state.progress}
      onSync={state.triggerSync}
    />
  );
}
