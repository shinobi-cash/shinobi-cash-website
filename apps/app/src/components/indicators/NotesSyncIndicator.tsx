"use client";

import { useEffect, useState, useCallback } from "react";
import { useSnapshot } from "valtio";
import { RotateCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { AuthController } from "@/controllers/AuthController";
import { NOTES_SYNC_INTERVAL_MS } from "@/constants/timings";

const SYNC_INTERVAL_SECONDS = NOTES_SYNC_INTERVAL_MS / 1000;

export function NotesSyncIndicator() {
  const authState = useSnapshot(AuthController.state);
  const { state, lastSyncedAt } = useSnapshot(NotesDiscoveryController.state);
  const [timeLeft, setTimeLeft] = useState(SYNC_INTERVAL_SECONDS);

  const isAuthenticated = authState.state.status === "authenticated";
  const isSyncing = state.status === "discovering";

  // Calculate time left based on lastSyncedAt
  useEffect(() => {
    if (isSyncing || !lastSyncedAt) return;

    const calculateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - lastSyncedAt) / 1000);
      const remaining = Math.max(0, SYNC_INTERVAL_SECONDS - elapsed);
      setTimeLeft(remaining);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [isSyncing, lastSyncedAt]);

  const handleManualSync = useCallback(() => {
    if (!isSyncing) {
      NotesDiscoveryController.refresh();
    }
  }, [isSyncing]);

  // Only show when authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCw className={`h-3.5 w-3.5 text-neutral-400 ${isSyncing ? "animate-spin" : ""}`} />
          <span className="flex justify-start w-14 text-neutral-400 tabular-nums">
            {isSyncing ? "Syncing..." : `${timeLeft}s`}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {isSyncing ? "Syncing notes..." : "Click to sync notes now"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
