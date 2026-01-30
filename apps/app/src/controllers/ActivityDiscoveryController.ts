import { proxy } from "valtio";

import type { ReadonlyNoteChain } from "@/types/notes";
import { NotesDiscoverySelectors } from "@/controllers/NotesDiscoveryController";
import type { ActivityEntry, ActivityStatus } from "@/types/activity";
import { deriveActivitiesFromNoteChains, getActivityCounts } from "@/utils/activityDerivation";

interface ActivityDiscoveryState {
  entries: ActivityEntry[];
  status: ActivityStatus;
  counts: {
    total: number;
    deposit: number;
    withdrawal: number;
    refund: number;
  };
  syncError: string | null;
}

const state = proxy<ActivityDiscoveryState>({
  entries: [],
  status: { type: "idle" },
  counts: {
    total: 0,
    deposit: 0,
    withdrawal: 0,
    refund: 0,
  },
  syncError: null,
});

export const ActivityDiscoverySelectors = {
  getEntries: (): readonly ActivityEntry[] => state.entries,
  getCounts: () => state.counts,
  getStatus: () => state.status,
  getSyncError: () => state.syncError,
};

export const ActivityDiscoveryController = {
  state,

  deriveFromNoteChains(noteChains: readonly ReadonlyNoteChain[]): void {
    const notesView = NotesDiscoverySelectors.getViewState();
    const entries = deriveActivitiesFromNoteChains(noteChains);
    const counts = getActivityCounts(entries);

    const status: ActivityStatus =
      notesView.status === "idle"
        ? { type: "idle" }
        : notesView.status === "error"
          ? { type: "error", message: "Failed to load activities" }
          : notesView.isLoading
            ? { type: "loading" }
            : entries.length === 0
              ? { type: "empty" }
              : { type: "ready" };

    state.entries = entries;
    state.counts = counts;
    state.status = status;
    state.syncError = notesView.syncError;
  },

  reset(): void {
    state.entries = [];
    state.counts = {
      total: 0,
      deposit: 0,
      withdrawal: 0,
      refund: 0,
    };
    state.status = { type: "idle" };
    state.syncError = null;
  },
};
