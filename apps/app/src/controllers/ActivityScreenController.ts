/**
 * Activity Screen Controller
 *
 * UI-only controller for activity screen state.
 * Owns filters and selection only.
 * No domain logic.
 */

import { ActivityFilter } from "@/features/activity/types";
import { proxy } from "valtio";

// ============ STATE ============

interface ActivityScreenState {
  activeFilter: ActivityFilter;
  selectedActivityId: string | null;
}

const state = proxy<ActivityScreenState>({
  activeFilter: "all",
  selectedActivityId: null,
});

// ============ SELECTORS ============

export const ActivityScreenSelectors = {
  getActiveFilter(): ActivityFilter {
    return state.activeFilter;
  },

  getSelectedActivityId(): string | null {
    return state.selectedActivityId;
  },
};

// ============ CONTROLLER ============

export const ActivityScreenController = {
  state,

  setFilter(filter: ActivityFilter): void {
    state.activeFilter = filter;
  },

  selectActivity(activityId: string): void {
    state.selectedActivityId = activityId;
  },

  clearSelection(): void {
    state.selectedActivityId = null;
  },

  reset(): void {
    state.activeFilter = "all";
    state.selectedActivityId = null;
  },
};
