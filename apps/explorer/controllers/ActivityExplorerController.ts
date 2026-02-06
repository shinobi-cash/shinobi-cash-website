import { proxy } from "valtio";
import type { Activity, PaginatedResponse } from "@shinobi-cash/data";
import { fetchActivities } from "@/services/data/indexerService";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

const PAGE_SIZE = 15;

interface ActivityExplorerState {
  // List state
  activities: Activity[];
  page: number;
  hasNextPage: boolean;
  isLoadingList: boolean;
  listError: string | null;

  // Selection state
  selectedActivity: Activity | null;

  // Config
  poolId: string;
}

const initialState: ActivityExplorerState = {
  activities: [],
  page: 0,
  hasNextPage: false,
  isLoadingList: false,
  listError: null,

  selectedActivity: null,

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
      const result: PaginatedResponse<Activity> = await fetchActivities(
        state.poolId,
        PAGE_SIZE,
        offset,
        "desc"
      );
      state.activities = result.items;
      state.hasNextPage = result.pageInfo?.hasNextPage ?? false;
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

  // Selection
  selectActivity(activity: Activity): void {
    state.selectedActivity = activity;
  },

  clearSelection(): void {
    state.selectedActivity = null;
  },

  // Pool selection
  setPoolId(poolId: string): void {
    state.poolId = poolId;
    state.page = 0;
    this.fetchActivities();
  },

  // Reset
  reset(): void {
    Object.assign(state, { ...initialState });
  },
};
