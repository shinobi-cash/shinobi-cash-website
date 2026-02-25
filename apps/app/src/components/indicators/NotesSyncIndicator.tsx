"use client";

import { useCallback } from "react";
import { useSnapshot } from "valtio";
import { RotateCw, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { AuthController } from "@/controllers/AuthController";

export function NotesSyncIndicator() {
  const authState = useSnapshot(AuthController.state);
  const { state } = useSnapshot(NotesDiscoveryController.state);

  const isAuthenticated = authState.state.status === "authenticated";
  const isSyncing = state.status === "discovering";

  const handleManualSync = useCallback(() => {
    if (!isSyncing) {
      NotesDiscoveryController.refresh();
    }
  }, [isSyncing]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2"
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
          ) : (
            <RotateCw className="h-3.5 w-3.5 text-neutral-400" />
          )}
          <span className="text-neutral-400">
            {isSyncing ? "Syncing..." : "Sync"}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{isSyncing ? "Syncing notes..." : "Click to sync notes now"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
