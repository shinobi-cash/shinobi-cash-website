import { proxy } from "valtio";
import type { NoteTree, DiscoveryProgress, Note, ActivityItem } from "@shinobi-cash/core/discovery";
import {
  getSpendableNotes,
  getWithdrawableNotes,
  getNoteTreeCounts,
} from "@shinobi-cash/core/discovery";
import { notesRepo } from "@/lib/storage/repositories/NotesRepository";
import { getShinobiClient } from "@/runtime/ClientSingleton";
import { createStateMachine } from "@/utils/stateMachine";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { AuthController } from "@/controllers/AuthController";
import { NotesError, NotesStatus } from "@/types/notes";

/**
 * Discovery state machine
 */
type DiscoveryState =
  | { status: "idle" }
  | { status: "discovering" }
  | { status: "ready" }
  | { status: "error"; error: NotesError };

/**
 * Full controller state (canonical truth)
 */
interface NotesDiscoveryControllerState {
  // Core state machine
  state: DiscoveryState;

  // Discovered note trees (single source of truth)
  noteTrees: NoteTree[];

  // Raw activities for display (source of truth for activity feed)
  activities: ActivityItem[];

  // Discovery progress
  progress: DiscoveryProgress | null;

  // Last error
  lastError: NotesError | null;

  // Last successful sync timestamp (for sync indicator)
  lastSyncedAt: number | null;
}

interface NotesDiscoveryViewState {
  status: NotesStatus;

  counts: {
    spendable: number;
    pending: number;
    spent: number;
  };

  totalCount: number;

  spendableNotes: Note[];

  isLoading: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;

  // Sync error when we have cached data but discovery failed
  // UI should show warning banner when this is set
  syncError: string | null;
}

const state = proxy<NotesDiscoveryControllerState>({
  state: { status: "idle" },
  noteTrees: [],
  activities: [],
  progress: null,
  lastError: null,
  lastSyncedAt: null,
});

// Discovery concurrency protection
let discoveryId = 0;
let abortController: AbortController | null = null;

// Debounce timer for refresh
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

// Debug logging
const log = {
  debug: (...args: unknown[]) => {
    console.debug("[NotesDiscoveryController]", ...args);
  },
  error: (...args: unknown[]) => {
    console.error("[NotesDiscoveryController]", ...args);
  },
};

const { transition } = createStateMachine<DiscoveryState>({
  name: "NotesDiscoveryController",
  allowedTransitions: {
    idle: ["discovering", "ready"],
    discovering: ["ready", "error", "idle"],
    ready: ["discovering"],
    error: ["idle", "discovering"],
  },
  getState: () => state.state,
  setState: (next) => {
    log.debug("Transition:", state.state.status, "→", next.status);
    state.state = next;

    // Clear last error on non-error transitions
    if (next.status !== "error") {
      state.lastError = null;
    } else {
      state.lastError = next.error;
    }
  },
});

/**
 * Selectors - Derived views from canonical state
 */
export const NotesDiscoverySelectors = {
  /**
   * Get all note trees
   */
  getNoteTrees: (): NoteTree[] => state.noteTrees,

  /**
   * Get spendable notes (for balance display - includes approved + rejected)
   */
  getSpendableNotes: (): Note[] => getSpendableNotes(state.noteTrees),

  /**
   * Get withdrawable notes (for private withdrawal - ASP approved only)
   */
  getWithdrawableNotes: (): Note[] => getWithdrawableNotes(state.noteTrees),

  /**
   * Get counts by status
   */
  getCounts: () => getNoteTreeCounts(state.noteTrees),

  /**
   * Get last used deposit index for a specific chain (for deposit service)
   * @param chainId - The chain ID to get the last used index for
   */
  getLastUsedIndex: (chainId?: number): number => {
    if (state.noteTrees.length === 0) return -1;

    // Filter trees by originChainId if chainId is provided
    const relevantTrees = chainId
      ? state.noteTrees.filter((tree) => {
          const rootNote = tree.root.note;
          return rootNote.originChainId === chainId.toString();
        })
      : state.noteTrees;

    if (relevantTrees.length === 0) return -1;

    // Sort by deposit index descending to get highest
    const sorted = [...relevantTrees].sort((a, b) => {
      return b.root.note.depositIndex - a.root.note.depositIndex;
    });

    return sorted[0].root.note.depositIndex;
  },

  /**
   * Status checks
   */
  isReady: (): boolean => state.state.status === "ready",
  isDiscovering: (): boolean => state.state.status === "discovering",
  isEmpty: (): boolean => state.noteTrees.length === 0,
  isIdle: (): boolean => state.state.status === "idle",

  getViewState(): NotesDiscoveryViewState {
    const { noteTrees, state: discoveryState, lastError } = state;

    const counts = getNoteTreeCounts(noteTrees);
    const spendableNotes = getSpendableNotes(noteTrees);

    const isDiscovering = discoveryState.status === "discovering";
    const isEmpty = noteTrees.length === 0;
    const hasError = discoveryState.status === "error";

    // Determine status: prioritize showing cached data over error state
    // Only show error if we have no cached data at all
    let status: NotesStatus = "ready";
    let syncError: string | null = null;

    if (discoveryState.status === "idle") {
      status = "idle";
    } else if (hasError && isEmpty) {
      // No cached data and error - show full error state
      status = "error";
    } else if (hasError && !isEmpty) {
      // Have cached data but sync failed - show data with warning
      status = "ready";
      syncError = lastError?.message ?? "Unable to sync with server";
    } else if (isDiscovering && isEmpty) {
      status = "loading";
    } else if (isEmpty) {
      status = "empty";
    }

    return {
      status,
      counts,
      totalCount: noteTrees.length,
      spendableNotes,
      isLoading: isDiscovering && isEmpty,
      isRefreshing: isDiscovering && !isEmpty,
      isEmpty,
      syncError,
    };
  },
};
/**
 * Notes Discovery Controller - Main API
 */
export const NotesDiscoveryController = {
  // Expose state for React adapters (read-only via valtio snapshot)
  state,

  /**
   * Bootstrap discovery controller
   * Loads cached notes from storage, then triggers initial discovery
   */
  async bootstrap(): Promise<void> {
    if (!AuthController.isAuthenticated()) return;

    // Load cache first for immediate UI
    await NotesDiscoveryController._loadCache();

    // If we have cached trees, mark ready immediately
    if (state.noteTrees.length > 0) {
      transition({ status: "ready" });
    }

    // Always trigger discovery to sync latest notes
    // This runs in background and updates state when complete
    NotesDiscoveryController.discover();
  },

  /**
   * Load cached notes from storage
   * Called by bootstrap() before discover()
   */
  async _loadCache(): Promise<void> {
    try {
      log.debug("Loading cached notes...");
      const cached = await notesRepo.getCachedNotes(
        getShinobiClient().accountId,
        SHINOBI_CASH_ETH_POOL.address
      );

      if (cached && cached.trees) {
        log.debug(
          `Loaded ${cached.trees.length} cached note trees, ${cached.activities.length} activities`
        );
        state.noteTrees = cached.trees;
        state.activities = cached.activities;
      }
    } catch (error) {
      log.error("Failed to load cached notes:", error);
      // Don't set error state for cache failures - just log
    }
  },

  /**
   * Start discovery process
   * Called by bootstrap() or refresh()
   */
  async discover(): Promise<void> {
    if (!AuthController.isAuthenticated()) {
      log.debug("Discovery blocked: not authenticated");
      return;
    }

    // Don't start if already discovering
    if (state.state.status === "discovering") {
      log.debug("Discovery already in progress");
      return;
    }

    const runId = ++discoveryId;
    log.debug(`Starting discovery (runId=${runId})`);

    // Cancel any pending discovery
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    transition({ status: "discovering" });

    try {
      const result = await getShinobiClient().sync({
        signal: abortController.signal,
        onProgress: (progress) => {
          if (runId === discoveryId) {
            state.progress = progress;
          }
        },
      });

      // Only update if this is still the current run
      if (runId === discoveryId) {
        log.debug(
          `Discovery complete: ${result.trees.length} note trees, ${result.activities.length} activities`
        );
        state.noteTrees = result.trees;
        state.activities = result.activities;
        state.progress = null;
        state.lastSyncedAt = Date.now();
        transition({ status: "ready" });
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof DOMException && error.name === "AbortError") {
        log.debug("Discovery aborted");
        return;
      }

      // Only update if this is still the current run
      if (runId === discoveryId) {
        log.error("Discovery failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Discovery failed";
        transition({
          status: "error",
          error: { type: "discovery", message: errorMessage },
        });
      }
    }
  },

  /**
   * Refresh notes (with debounce)
   * Called by transaction tracking or sync button
   */
  refresh(): void {
    log.debug("Refresh requested");

    // Debounce rapid refresh calls (500ms)
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    refreshTimeout = setTimeout(() => {
      NotesDiscoveryController.discover();
    }, 500);
  },

  /**
   * Reset controller state
   */
  reset(): void {
    log.debug("Resetting controller state");

    // Cancel any ongoing discovery
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    // Clear debounce timer
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }

    // Reset state
    transition({ status: "idle" });
    state.noteTrees = [];
    state.activities = [];
    state.progress = null;
    state.lastError = null;
    state.lastSyncedAt = null;
  },

};
