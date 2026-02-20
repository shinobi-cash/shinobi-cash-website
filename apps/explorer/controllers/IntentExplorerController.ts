import { proxy } from "valtio";
import type { Intent, PaginatedResponse } from "@shinobi-cash/data";
import type { IntentTypeFilter, IntentPhaseFilter } from "@/services/data/indexerService";
import { fetchIntents, fetchIntentDetails } from "@/services/data/indexerService";

const PAGE_SIZE = 15;

// Timeline event type (built from Intent's embedded phase data)
export interface IntentTimelineEvent {
  phase: string;
  txHash: string;
  timestamp: string;
  chainId: string;
  solver?: string;
}

// Types
export interface IntentFilters {
  intentType?: IntentTypeFilter;
  phase?: IntentPhaseFilter;
  originChainId?: string;
  destinationChainId?: string;
}

interface IntentExplorerState {
  // List state
  intents: Intent[];
  page: number;
  hasNextPage: boolean;
  isLoadingList: boolean;
  listError: string | null;

  // Search state
  searchOrderId: string;
  activeSearchOrderId: string;
  searchedIntent: Intent | null;
  searchedTimeline: IntentTimelineEvent[] | null;
  isSearching: boolean;
  searchError: string | null;

  // Selection state
  selectedIntent: Intent | null;
  selectedTimeline: IntentTimelineEvent[] | null;
  isLoadingTimeline: boolean;
  timelineError: string | null;

  // Filters
  filters: IntentFilters;
}

const initialState: IntentExplorerState = {
  intents: [],
  page: 0,
  hasNextPage: false,
  isLoadingList: false,
  listError: null,

  searchOrderId: "",
  activeSearchOrderId: "",
  searchedIntent: null,
  searchedTimeline: null,
  isSearching: false,
  searchError: null,

  selectedIntent: null,
  selectedTimeline: null,
  isLoadingTimeline: false,
  timelineError: null,

  filters: {},
};

const state = proxy<IntentExplorerState>({ ...initialState });

// Selectors
export const IntentExplorerSelectors = {
  isInSearchMode(): boolean {
    return state.isSearching || !!state.searchedIntent || !!state.searchError;
  },

  getDisplayIntents(): Intent[] {
    if (this.isInSearchMode() && state.searchedIntent) {
      return [state.searchedIntent];
    }
    return state.intents;
  },

  getSelectedTimeline(): IntentTimelineEvent[] | null {
    // If search result is selected, use its timeline
    if (state.activeSearchOrderId && state.searchedTimeline) {
      return state.searchedTimeline;
    }
    return state.selectedTimeline;
  },

  canGoPrevious(): boolean {
    return state.page > 0 && !state.isLoadingList;
  },

  canGoNext(): boolean {
    return state.hasNextPage && !state.isLoadingList;
  },
};

// Controller
export const IntentExplorerController = {
  state,

  // Initialize with URL param if present
  initialize(urlOrderId?: string | null): void {
    if (urlOrderId) {
      state.searchOrderId = urlOrderId;
      state.activeSearchOrderId = urlOrderId;
      this.executeSearch();
    } else {
      this.fetchIntents();
    }
  },

  // List operations
  async fetchIntents(): Promise<void> {
    if (IntentExplorerSelectors.isInSearchMode()) return;

    state.isLoadingList = true;
    state.listError = null;

    try {
      const offset = state.page * PAGE_SIZE;
      const result: PaginatedResponse<Intent> = await fetchIntents(
        PAGE_SIZE,
        offset,
        "desc",
        state.filters
      );
      state.intents = result.data;
      state.hasNextPage = result.pagination.hasMore;
    } catch (error) {
      state.listError = error instanceof Error ? error.message : "Failed to fetch intents";
    } finally {
      state.isLoadingList = false;
    }
  },

  setPage(page: number): void {
    state.page = page;
    this.fetchIntents();
  },

  nextPage(): void {
    if (IntentExplorerSelectors.canGoNext()) {
      this.setPage(state.page + 1);
    }
  },

  previousPage(): void {
    if (IntentExplorerSelectors.canGoPrevious()) {
      this.setPage(state.page - 1);
    }
  },

  // Filter operations
  setFilter<K extends keyof IntentFilters>(key: K, value: IntentFilters[K]): void {
    state.filters[key] = value;
    state.page = 0;
    this.fetchIntents();
  },

  clearFilters(): void {
    state.filters = {};
    state.page = 0;
    this.fetchIntents();
  },

  // Search operations
  setSearchOrderId(orderId: string): void {
    state.searchOrderId = orderId;
  },

  async executeSearch(): Promise<void> {
    const orderId = state.searchOrderId;
    if (!orderId.startsWith("0x") || orderId.length <= 10) {
      return;
    }

    state.activeSearchOrderId = orderId;
    state.isSearching = true;
    state.searchError = null;
    state.searchedIntent = null;
    state.searchedTimeline = null;

    try {
      const result = await fetchIntentDetails(orderId);
      if (result) {
        state.searchedIntent = result.intent;
        state.searchedTimeline = result.timeline;
        // Auto-select the searched intent
        state.selectedIntent = result.intent;
        state.selectedTimeline = result.timeline;
      } else {
        state.searchError = "Intent not found";
      }
    } catch (error) {
      state.searchError = error instanceof Error ? error.message : "Search failed";
    } finally {
      state.isSearching = false;
    }
  },

  clearSearch(): void {
    state.searchOrderId = "";
    state.activeSearchOrderId = "";
    state.searchedIntent = null;
    state.searchedTimeline = null;
    state.searchError = null;
    state.selectedIntent = null;
    state.selectedTimeline = null;
    // Fetch list after clearing search
    this.fetchIntents();
  },

  // Selection operations
  selectIntent(intent: Intent): void {
    state.selectedIntent = intent;

    // If this is the searched intent, we already have the timeline
    if (state.activeSearchOrderId && intent.orderId === state.searchedIntent?.orderId) {
      state.selectedTimeline = state.searchedTimeline;
      return;
    }

    // Otherwise fetch the timeline
    this.fetchTimeline(intent.orderId);
  },

  async fetchTimeline(orderId: string): Promise<void> {
    state.isLoadingTimeline = true;
    state.timelineError = null;
    state.selectedTimeline = null;

    try {
      const result = await fetchIntentDetails(orderId);
      if (result) {
        state.selectedTimeline = result.timeline;
      }
    } catch (error) {
      state.timelineError = error instanceof Error ? error.message : "Failed to load timeline";
    } finally {
      state.isLoadingTimeline = false;
    }
  },

  clearSelection(): void {
    state.selectedIntent = null;
    state.selectedTimeline = null;
    state.timelineError = null;
  },

  // Reset
  reset(): void {
    Object.assign(state, initialState);
  },
};
