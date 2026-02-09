/**
 * Activity Discovery Snapshot
 *
 * React adapter that syncs NotesDiscoveryController → ActivityDiscoveryController.
 * No domain logic lives here.
 *
 * Uses selective subscriptions to minimize re-renders:
 * - Only subscribes to noteTrees from NotesDiscoveryController
 * - Progress/status changes in notes discovery don't trigger re-renders
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
 * - Re-derives activities when note trees change (selective subscription)
 *
 * @returns Readonly snapshot of activity discovery state
 */
export function useActivityDiscovery() {
  // Subscribe to only noteTrees from upstream discovery (selective)
  // This prevents re-renders when progress/status changes in NotesDiscoveryController
  const { noteTrees } = useSnapshot(NotesDiscoveryController.state);

  // Subscribe to activity discovery controller
  const activitySnapshot = useSnapshot(ActivityDiscoveryController.state);

  // Recompute activities whenever note trees change
  useEffect(() => {
    // Cast to mutable type - the function only reads, doesn't mutate
    ActivityDiscoveryController.deriveFromNoteTrees(noteTrees as unknown as import("@shinobi-cash/core/discovery").NoteTree[]);
  }, [noteTrees]);

  return activitySnapshot;
}
