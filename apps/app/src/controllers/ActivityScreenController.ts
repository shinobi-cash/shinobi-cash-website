import { ActivityFilter } from "@/types/activity";
import { proxy } from "valtio";

interface ActivityScreenState {
  activeFilter: ActivityFilter;
  selectedActivityId: string | null;
}

const state = proxy<ActivityScreenState>({
  activeFilter: "all",
  selectedActivityId: null,
});

export const ActivityScreenSelectors = {
  getActiveFilter(): ActivityFilter {
    return state.activeFilter;
  },

  getSelectedActivityId(): string | null {
    return state.selectedActivityId;
  },
};

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
