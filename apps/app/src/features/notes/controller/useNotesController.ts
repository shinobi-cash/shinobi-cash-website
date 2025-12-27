/**
 * Notes Controller
 * Main orchestrator for the notes feature
 * Coordinates all child hooks and owns the state machine
 */

import { useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import type { Note } from "@/lib/storage/types";
import type { NotesStatus, NotesError, NoteFilter, NoteChainView } from "../types";
import { useNoteDiscovery } from "../hooks/useNoteDiscovery";
import { useNoteFilter } from "../hooks/useNoteFilter";
import {
  filterNoteChains,
  getNoteChainCounts,
  sortNoteChainsByTimestamp,
  getAvailableNotes,
  getLastNote,
} from "../protocol/noteFiltering";

// ============ TYPES ============

export interface NotesController {
  // State
  status: NotesStatus;
  lastError: NotesError;

  // Note chain views (pre-computed for UI rendering)
  // UI just renders, doesn't make domain decisions
  filteredNoteViews: NoteChainView[];

  // Filter state
  activeFilter: NoteFilter;
  availableCount: number;
  pendingCount: number;
  spentCount: number;
  totalCount: number;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;

  // Available notes (for withdrawal)
  availableNotes: Note[];

  // Actions
  setFilter: (filter: NoteFilter) => void;
  refresh: () => Promise<void>;
  reset: () => void;
}

// ============ CONTROLLER ============

export function useNotesController(): NotesController {
  const { publicKey, accountKey } = useAuth();
  const { onTransactionIndexed } = useTransactionTracking();
  const poolAddress = SHINOBI_CASH_ETH_POOL.address;

  // ============ CHILD HOOKS ============

  // Note: This controller is safe to mount even when unauthenticated
  // useNoteDiscovery has internal guard (!!publicKey && !!accountKey)
  // and won't fetch data until authenticated. All memos below will
  // short-circuit to empty arrays when discovery.data is null.
  const discovery = useNoteDiscovery(
    publicKey || "",
    poolAddress,
    accountKey || BigInt(0),
    !!publicKey && !!accountKey
  );

  // Destructure to avoid useEffect dependency warning
  const { refresh: refreshDiscovery } = discovery;

  const filter = useNoteFilter("available");

  // ============ DERIVED STATE ============

  // Extract note chains from discovery data
  const noteChains = useMemo(() => {
    if (!discovery.data?.notes) return [];
    return discovery.data.notes;
  }, [discovery.data]);

  // Sort note chains by timestamp (newest first)
  const sortedNoteChains = useMemo(() => {
    return sortNoteChainsByTimestamp(noteChains);
  }, [noteChains]);

  // Filter note chains based on active filter
  const filteredNoteChains = useMemo(() => {
    return filterNoteChains(sortedNoteChains, filter.activeFilter);
  }, [sortedNoteChains, filter.activeFilter]);

  // Create view models for UI rendering (eliminates domain logic from components)
  const filteredNoteViews = useMemo((): NoteChainView[] => {
    return filteredNoteChains.map((chain, index) => {
      const lastNote = getLastNote(chain);
      return {
        chain,
        lastNote,
        length: chain.length,
        key: `chain-${index}-${lastNote.depositIndex}-${lastNote.changeIndex}`,
      };
    });
  }, [filteredNoteChains]);

  // Calculate counts for all filter types (single pass)
  const counts = useMemo(() => {
    return getNoteChainCounts(noteChains);
  }, [noteChains]);

  // Get available notes (for withdrawal feature)
  const availableNotes = useMemo(() => {
    return getAvailableNotes(noteChains);
  }, [noteChains]);

  // Error domain typing
  const lastError: NotesError = discovery.discoveryError
    ? { type: "discovery", message: discovery.discoveryError }
    : null;

  // Status state machine - single source of truth
  const getStatus = useCallback((): NotesStatus => {
    if (!publicKey || !accountKey) return "idle";
    if (discovery.discoveryError) return "error";
    if (discovery.isDiscovering && !discovery.data) return "loading";
    if (noteChains.length === 0) return "empty";
    return "ready";
  }, [
    publicKey,
    accountKey,
    discovery.discoveryError,
    discovery.isDiscovering,
    discovery.data,
    noteChains.length,
  ]);

  const status = getStatus();

  // ============ AUTO-REFRESH ON TX INDEXED ============

  // Notes may change after deposits/withdrawals are indexed on-chain
  // Auto-refresh to show updated balances and status
  useEffect(() => {
    const cleanup = onTransactionIndexed(() => {
      refreshDiscovery();
    });
    return cleanup;
  }, [onTransactionIndexed, refreshDiscovery]);

  // ============ ACTIONS ============

  /**
   * Refresh note discovery
   */
  const refresh = useCallback(async () => {
    if (!publicKey || !accountKey) return;
    await refreshDiscovery();
  }, [publicKey, accountKey, refreshDiscovery]);

  /**
   * Reset filter to default
   */
  const reset = useCallback(() => {
    filter.reset();
  }, [filter]);

  // ============ RETURN CONTROLLER ============

  return {
    // State
    status,
    lastError,

    // Note chain views (pre-computed for UI)
    filteredNoteViews,

    // Filter state
    activeFilter: filter.activeFilter,
    availableCount: counts.available,
    pendingCount: counts.pending,
    spentCount: counts.spent,
    totalCount: noteChains.length,

    // Loading states
    isLoading: discovery.isDiscovering && !discovery.data,
    isRefreshing: discovery.isDiscovering && !!discovery.data,

    // Available notes
    availableNotes,

    // Actions
    setFilter: filter.setFilter,
    refresh,
    reset,
  };
}
