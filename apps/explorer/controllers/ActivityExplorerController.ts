import { proxy } from "valtio";
import type { ActivityItem, TimelineEvent, PaginatedResponse } from "@shinobi-cash/data";
import { fetchActivities, fetchActivityDetails } from "@/services/data/indexerService";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

const PAGE_SIZE = 15;

interface ActivityExplorerState {
  // List state
  activities: ActivityItem[];
  page: number;
  hasNextPage: boolean;
  isLoadingList: boolean;
  listError: string | null;

  // Selection state (from list)
  selectedTxHash: string | null;

  // Detail state (fetched by txHash)
  selectedActivity: ActivityItem | null;
  selectedTimeline: TimelineEvent[] | null;
  isLoadingDetails: boolean;
  detailsError: string | null;

  // Config
  poolId: string;
}

const initialState: ActivityExplorerState = {
  activities: [],
  page: 0,
  hasNextPage: false,
  isLoadingList: false,
  listError: null,

  selectedTxHash: null,
  selectedActivity: null,
  selectedTimeline: null,
  isLoadingDetails: false,
  detailsError: null,

  poolId: SHINOBI_CASH_ETH_POOL.address,
};

const state = proxy<ActivityExplorerState>({ ...initialState });

// Selectors
export const ActivityExplorerSelectors = {
  canGoPrevious(): boolean {
    return state.page > 0 && !state.isLoadingList;
  },

  canGoNext(): boolean {
    return state.hasNextPage && !state.isLoadingList;
  },
};

// Controller
export const ActivityExplorerController = {
  state,

  // Initialize
  initialize(): void {
    this.fetchActivities();
  },

  // List operations
  async fetchActivities(): Promise<void> {
    state.isLoadingList = true;
    state.listError = null;

    try {
      const offset = state.page * PAGE_SIZE;
      const result: PaginatedResponse<ActivityItem> = await fetchActivities(
        state.poolId,
        PAGE_SIZE,
        offset,
        "desc"
      );
      state.activities = result.data;
      state.hasNextPage = result.pagination.hasMore;
    } catch (error) {
      state.listError = error instanceof Error ? error.message : "Failed to fetch activities";
    } finally {
      state.isLoadingList = false;
    }
  },

  setPage(page: number): void {
    state.page = page;
    this.fetchActivities();
  },

  nextPage(): void {
    if (ActivityExplorerSelectors.canGoNext()) {
      this.setPage(state.page + 1);
    }
  },

  previousPage(): void {
    if (ActivityExplorerSelectors.canGoPrevious()) {
      this.setPage(state.page - 1);
    }
  },

  // Selection - fetch full details by txHash
  async selectActivity(activity: ActivityItem): Promise<void> {
    state.selectedTxHash = activity.txHash;
    state.isLoadingDetails = true;
    state.detailsError = null;
    state.selectedActivity = null;
    state.selectedTimeline = null;

    try {
      const result = await fetchActivityDetails(activity.txHash);
      if (result) {
        state.selectedActivity = result.activity;
        state.selectedTimeline = result.timeline;
      } else {
        state.detailsError = "Activity not found";
      }
    } catch (error) {
      state.detailsError =
        error instanceof Error ? error.message : "Failed to fetch activity details";
    } finally {
      state.isLoadingDetails = false;
    }
  },

  clearSelection(): void {
    state.selectedTxHash = null;
    state.selectedActivity = null;
    state.selectedTimeline = null;
    state.detailsError = null;
  },

  // Pool selection
  setPoolId(poolId: string): void {
    state.poolId = poolId;
    state.page = 0;
    this.clearSelection();
    this.fetchActivities();
  },

  // Reset
  reset(): void {
    Object.assign(state, { ...initialState });
  },
};
