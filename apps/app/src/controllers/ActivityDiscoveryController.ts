import { proxy } from "valtio";

import type { ReadonlyNoteChain } from "@/types/notes";
import { NotesDiscoverySelectors } from "@/controllers/NotesDiscoveryController";
import { Activity, ActivityStatus } from "@/types/activity";
import { deriveActivitiesFromNoteChains, getActivityCounts } from "@/utils/activityDerivation";

interface ActivityDiscoveryState {
  activities: Activity[];
  status: ActivityStatus;
  counts: {
    total: number;
    deposit: number;
    withdrawal: number;
    refund: number;
  };
}

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

export const ActivityDiscoverySelectors = {
  getActivities: (): readonly Activity[] => state.activities,
  getCounts: () => state.counts,
  getStatus: () => state.status,
};

export const ActivityDiscoveryController = {
  state,

  deriveFromNoteChains(noteChains: readonly ReadonlyNoteChain[]): void {
    const notesView = NotesDiscoverySelectors.getViewState();
    const activities = deriveActivitiesFromNoteChains(noteChains);
    const counts = getActivityCounts(activities);

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
