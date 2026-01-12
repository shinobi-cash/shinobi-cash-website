
/**
 * Activity Discovery Snapshot
 *
 * React adapter that syncs NotesDiscoveryController → ActivityDiscoveryController.
 * No domain logic lives here.
 */

"use client";

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { ActivityDiscoveryController } from "@/controllers/ActivityDiscoveryController";

/**
 * React adapter for ActivityDiscoveryController
 *
 * - Subscribes to activity discovery state
 * - Re-derives activities when note chains change
 *
 * @returns Readonly snapshot of activity discovery state
 */
export function useActivityDiscoverySnapshot() {
  // Subscribe to upstream discovery state
  const notesSnapshot = useSnapshot(NotesDiscoveryController.state);

  // Subscribe to activity discovery controller
  const activitySnapshot = useSnapshot(ActivityDiscoveryController.state);

  // Recompute activities whenever note chains change
  useEffect(() => {
    ActivityDiscoveryController.deriveFromNoteChains(notesSnapshot.noteChains);
  }, [notesSnapshot.noteChains]);

  return activitySnapshot;
}
