import { proxy } from "valtio";
import type { NoteChain, DiscoveryProgress, Note } from "@shinobi-cash/core/discovery";
import { notesRepo } from "@/lib/storage/repositories/NotesRepository";
import { fetchActivities } from "@/utils/indexer";
import { createStateMachine } from "@/utils/stateMachine";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { AuthController } from "@/controllers/AuthController";
import { NotesError, NotesStatus, ReadonlyNoteChain } from "@/types/notes";
import {
  getSpendableNotes,
  getWithdrawableNotes,
  getLastNote,
  getNoteChainCounts,
} from "@/utils/noteFiltering";
import { NOTES_SYNC_INTERVAL_MS } from "@/constants/timings";

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

  // Discovered notes (single source of truth)
  noteChains: NoteChain[];

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
  noteChains: [],
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
    discovering: ["ready", "error"],
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
   * Get all note chains
   */
  getNoteChains: (): ReadonlyNoteChain[] => state.noteChains,

  /**
   * Get spendable notes (for balance display - includes approved + rejected)
   */
  getSpendableNotes: (): Note[] => getSpendableNotes(state.noteChains),

  /**
   * Get withdrawable notes (for private withdrawal - ASP approved only)
   */
  getWithdrawableNotes: (): Note[] => getWithdrawableNotes(state.noteChains),

  /**
   * Get counts by status
   */
  getCounts: () => getNoteChainCounts(state.noteChains),

  /**
   * Get last used deposit index (for deposit service)
   */
  getLastUsedIndex: (): number => {
    if (state.noteChains.length === 0) return -1;

    // Sort by deposit index descending to get highest
    const sorted = [...state.noteChains].sort((a, b) => {
      const lastNoteA = getLastNote(a);
      const lastNoteB = getLastNote(b);
      return lastNoteB.depositIndex - lastNoteA.depositIndex;
    });

    const highestChain = sorted[0];
    const lastNote = getLastNote(highestChain);
    return lastNote.depositIndex;
  },

  /**
   * Status checks
   */
  isReady: (): boolean => state.state.status === "ready",
  isDiscovering: (): boolean => state.state.status === "discovering",
  isEmpty: (): boolean => state.noteChains.length === 0,
  isIdle: (): boolean => state.state.status === "idle",

  getViewState(): NotesDiscoveryViewState {
    const { noteChains, state: discoveryState, lastError } = state;

    const counts = getNoteChainCounts(noteChains);
    const spendableNotes = getSpendableNotes(noteChains);

    const isDiscovering = discoveryState.status === "discovering";
    const isEmpty = noteChains.length === 0;
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
      totalCount: noteChains.length,
      spendableNotes,
      isLoading: isDiscovering && isEmpty,
      isRefreshing: isDiscovering && !isEmpty,
      isEmpty,
      syncError,
    };
  },
};
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

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
    const crypto = AuthController.state.crypto;
    if (!crypto.publicKey) return;

    // Load cache first for immediate UI
    await NotesDiscoveryController._loadCache();

    // If we have cached notes, mark ready immediately
    if (state.noteChains.length > 0) {
      transition({ status: "ready" });
    }

    // Always trigger discovery to sync latest notes
    // This runs in background and updates state when complete
    NotesDiscoveryController.discover();
  },

  /**
   * Load cached notes from storage
   * Internal method called by bootstrap
   */
  async _loadCache(): Promise<void> {
    const crypto = AuthController.state.crypto;
    if (!crypto.publicKey) return;

    try {
      log.debug("Loading cached notes...");
      const cached = await notesRepo.getCachedNotes(
        crypto.publicKey,
        SHINOBI_CASH_ETH_POOL.address
      );

      if (cached && cached.notes) {
        log.debug(`Loaded ${cached.notes.length} cached note chains`);
        state.noteChains = cached.notes;
      }
    } catch (error) {
      log.error("Failed to load cached notes:", error);
      // Don't set error state for cache failures - just log
    }
  },

  /**
   * Start discovery process
   * Called by React adapter when crypto is ready
   */
  async discover(): Promise<void> {
    // Read crypto from AuthController (single source of truth)
    const crypto = AuthController.state.crypto;

    // Preconditions
    if (!crypto.cryptoReady || !crypto.publicKey || !crypto.accountKey) {
      log.debug("Discovery blocked: crypto not ready");
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

    // Load cache first (non-blocking)
    const hasCache = state.noteChains.length > 0;
    if (!hasCache) {
      await NotesDiscoveryController._loadCache();
    }

    // Transition to discovering state
    transition({ status: "discovering" });

    try {
      const result = await notesRepo.discoverNotes(
        crypto.publicKey,
        SHINOBI_CASH_ETH_POOL.address,
        crypto.accountKey,
        async (poolAddress, limit, cursor, orderDirection) => {
          const result = await fetchActivities(poolAddress, limit, cursor, orderDirection);
          return { items: result.items, pageInfo: result.pageInfo };
        },
        {
          signal: abortController.signal,
          onProgress: (progress) => {
            if (runId === discoveryId) {
              state.progress = progress;
            }
          },
        }
      );

      // Only update if this is still the current run
      if (runId === discoveryId) {
        log.debug(`Discovery complete: ${result.notes.length} note chains found`);
        state.noteChains = result.notes;
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
    state.noteChains = [];
    state.progress = null;
    state.lastError = null;
    state.lastSyncedAt = null;
  },

  startBackgroundSync() {
    if (syncIntervalId) return;

    log.debug(`Starting background sync (interval: ${NOTES_SYNC_INTERVAL_MS}ms)`);

    syncIntervalId = setInterval(() => {
      NotesDiscoveryController.refresh();
    }, NOTES_SYNC_INTERVAL_MS);
  },

  stopBackgroundSync() {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
      log.debug("Background sync stopped");
    }
  },
};
