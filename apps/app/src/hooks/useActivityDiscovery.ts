/**
 * Activity Discovery Snapshot
 *
 * React adapter that syncs NotesDiscoveryController → ActivityDiscoveryController.
 * No domain logic lives here.
 *
 * Uses selective subscriptions to minimize re-renders:
 * - Only subscribes to activities from NotesDiscoveryController
 * - Progress/status changes in notes discovery don't trigger re-renders
 */

"use client";

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import type { ActivityItem } from "@shinobi-cash/data";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";
import { ActivityDiscoveryController } from "@/controllers/ActivityDiscoveryController";

/**
 * React adapter for ActivityDiscoveryController
 *
 * - Subscribes to activity discovery state
 * - Re-derives activities when raw activities change (selective subscription)
 *
 * @returns Readonly snapshot of activity discovery state
 */
export function useActivityDiscovery() {
  // Subscribe to only activities from upstream discovery (selective)
  // This prevents re-renders when progress/status changes in NotesDiscoveryController
  const { activities } = useSnapshot(NotesDiscoveryController.state);

  // Subscribe to activity discovery controller
  const activitySnapshot = useSnapshot(ActivityDiscoveryController.state);

  // Recompute activity entries whenever raw activities change
  // Cast to mutable array since Valtio snapshot returns readonly
  useEffect(() => {
    ActivityDiscoveryController.deriveFromActivities(activities as ActivityItem[]);
  }, [activities]);

  return activitySnapshot;
}
