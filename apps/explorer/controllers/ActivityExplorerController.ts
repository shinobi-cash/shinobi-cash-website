import { proxy } from "valtio";
import type { Activity, PaginatedResponse } from "@shinobi-cash/data";
import { fetchActivities } from "@/services/data/indexerService";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

const PAGE_SIZE = 15;

interface ActivityExplorerState {
  // List state
  activities: Activity[];
  hasNextPage: boolean;
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  listError: string | null;
  offset: number;

  // Selection state
  selectedActivity: Activity | null;

  // Config
  poolId: string;
}

const initialState: ActivityExplorerState = {
  activities: [],
  hasNextPage: false,
  isLoadingInitial: false,
  isLoadingMore: false,
  listError: null,
  offset: 0,

  selectedActivity: null,

  poolId: SHINOBI_CASH_ETH_POOL.address,
};

const state = proxy<ActivityExplorerState>({ ...initialState });

// Controller
export const ActivityExplorerController = {
  state,

  // Initialize and fetch first page
  initialize(): void {
    this.fetchInitial();
  },

  // Fetch initial activities
  async fetchInitial(): Promise<void> {
    state.isLoadingInitial = true;
    state.listError = null;
    state.activities = [];
    state.offset = 0;

    try {
      const result: PaginatedResponse<Activity> = await fetchActivities(
        state.poolId,
        PAGE_SIZE,
        undefined,
        "desc"
      );
      state.activities = result.items;
      state.hasNextPage = result.pageInfo?.hasNextPage ?? false;
      state.offset = result.items.length;
    } catch (error) {
      state.listError = error instanceof Error ? error.message : "Failed to fetch activities";
    } finally {
      state.isLoadingInitial = false;
    }
  },

  // Fetch next page (infinite scroll)
  async fetchMore(): Promise<void> {
    if (state.isLoadingMore || !state.hasNextPage) return;

    state.isLoadingMore = true;

    try {
      const result: PaginatedResponse<Activity> = await fetchActivities(
        state.poolId,
        PAGE_SIZE,
        state.offset,
        "desc"
      );
      state.activities = [...state.activities, ...result.items];
      state.hasNextPage = result.pageInfo?.hasNextPage ?? false;
      state.offset += result.items.length;
    } catch (error) {
      state.listError = error instanceof Error ? error.message : "Failed to fetch more activities";
    } finally {
      state.isLoadingMore = false;
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
    this.fetchInitial();
  },

  // Reset
  reset(): void {
    Object.assign(state, { ...initialState, poolId: state.poolId });
  },
};

// Selectors
export const ActivityExplorerSelectors = {
  isLoading(): boolean {
    return state.isLoadingInitial;
  },

  isFetchingMore(): boolean {
    return state.isLoadingMore;
  },

  canFetchMore(): boolean {
    return state.hasNextPage && !state.isLoadingMore;
  },
};
