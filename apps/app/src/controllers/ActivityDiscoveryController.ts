/**
 * Activity Discovery Controller
 *
 * Domain-level controller that derives activities from note chains.
 * Single source of truth for activity data & status.
 */

import { proxy } from "valtio";

import type { ReadonlyNoteChain } from "@/features/notes/types";
import { NotesDiscoverySelectors } from "@/controllers/NotesDiscoveryController";
import { Activity, ActivityStatus } from "@/features/activity/types";
import {
  deriveActivitiesFromNoteChains,
  getActivityCounts,
} from "@/utils/activityDerivation";

// ============ STATE TYPES ============

interface ActivityDiscoveryState {
  // Source data (derived from notes)
  activities: Activity[];

  // Derived status
  status: ActivityStatus;

  // Counts
  counts: {
    total: number;
    deposit: number;
    withdrawal: number;
    refund: number;
  };
}

// ============ STATE ============

const state = proxy<ActivityDiscoveryState>({
  activities: [],
  status: { type: "idle" },
  counts: {
    total: 0,
    deposit: 0,
    withdrawal: 0,
    refund: 0,
  },
});

// ============ SELECTORS ============

export const ActivityDiscoverySelectors = {
  getActivities: (): readonly Activity[] => state.activities,
  getCounts: () => state.counts,
  getStatus: () => state.status,
};

// ============ CONTROLLER ============

export const ActivityDiscoveryController = {
  state,

  /**
   * Recompute activities from note chains
   * Called by React adapter when notes change
   */
  deriveFromNoteChains(noteChains: readonly ReadonlyNoteChain[]): void {
    const notesView = NotesDiscoverySelectors.getViewState();

    // Derive activities
    const activities = deriveActivitiesFromNoteChains(noteChains);
    const counts = getActivityCounts(activities);

    // Status machine (canonical)
    const status: ActivityStatus =
      notesView.status === "idle"
        ? { type: "idle" }
        : notesView.status === "error"
          ? { type: "error", message: "Failed to load activities" }
          : notesView.isLoading
            ? { type: "loading" }
            : activities.length === 0
              ? { type: "empty" }
              : { type: "ready" };

    // Commit atomically
    state.activities = activities;
    state.counts = counts;
    state.status = status;
  },

  reset(): void {
    state.activities = [];
    state.counts = {
      total: 0,
      deposit: 0,
      withdrawal: 0,
      refund: 0,
    };
    state.status = { type: "idle" };
  },
};
