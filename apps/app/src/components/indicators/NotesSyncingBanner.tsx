"use client";

import { Loader2 } from "lucide-react";
import { useSnapshot } from "valtio";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

/**
 * Shows a banner when notes are syncing for the first time (no cache)
 * Disappears once notes are ready or if there's cached data
 */
export function NotesSyncingBanner() {
  const state = useSnapshot(NotesDiscoveryController.state);

  const isDiscovering = state.state.status === "discovering";
  const isEmpty = state.noteChains.length === 0;

  // Only show when discovering with no cached notes
  if (!isDiscovering || !isEmpty) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Syncing your notes...</span>
    </div>
  );
}
