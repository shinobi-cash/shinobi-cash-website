"use client";

import { useSnapshot } from "valtio";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

/**
 * Shows a centered loader when notes are syncing for the first time (no cache)
 * Similar to auth's "Initializing..." screen
 */
export function NotesSyncingScreen() {
  const state = useSnapshot(NotesDiscoveryController.state);

  const isDiscovering = state.state.status === "discovering";
  const isEmpty = state.noteChains.length === 0;

  // Only show when discovering with no cached notes
  if (!isDiscovering || !isEmpty) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-white" />
      <h2 className="text-lg font-semibold">Syncing notes...</h2>
    </div>
  );
}
