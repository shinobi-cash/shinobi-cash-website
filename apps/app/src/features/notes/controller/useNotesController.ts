/**
 * Notes Controller
 * UI-facing orchestrator for the notes feature
 * (Discovery + crypto lifecycle delegated to domain hook)
 */

import { useMemo, useCallback } from "react";
import type { Note } from "@shinobi-cash/core";
import type { NotesStatus, NotesError, NoteFilter, NoteChainView } from "../types";

import { useNoteDiscoverySession } from "@/hooks/notes/useNoteDiscoverySession";
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
  status: NotesStatus;
  lastError: NotesError;

  filteredNoteViews: NoteChainView[];

  activeFilter: NoteFilter;
  availableCount: number;
  pendingCount: number;
  spentCount: number;
  totalCount: number;

  isLoading: boolean;
  isRefreshing: boolean;

  availableNotes: Note[];

  setFilter: (filter: NoteFilter) => void;
  reset: () => void;
}

// ============ CONTROLLER ============

export function useNotesController(): NotesController {
  // Domain-level discovery + crypto lifecycle
  const { discovery, cryptoReady } = useNoteDiscoverySession();

  // UI filter state
  const filter = useNoteFilter("available");

  // ============ DERIVED STATE ============

  const noteChains = useMemo(() => {
    return discovery.data?.notes ?? [];
  }, [discovery.data]);

  const sortedNoteChains = useMemo(() => {
    return sortNoteChainsByTimestamp(noteChains);
  }, [noteChains]);

  const filteredNoteChains = useMemo(() => {
    return filterNoteChains(sortedNoteChains, filter.activeFilter);
  }, [sortedNoteChains, filter.activeFilter]);

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

  const counts = useMemo(() => {
    return getNoteChainCounts(noteChains);
  }, [noteChains]);

  const availableNotes = useMemo(() => {
    return getAvailableNotes(noteChains);
  }, [noteChains]);

  const lastError: NotesError = discovery.discoveryError
    ? { type: "discovery", message: discovery.discoveryError }
    : null;

  // ============ STATUS MACHINE ============

  const status: NotesStatus = !cryptoReady
    ? "idle"
    : discovery.discoveryError
      ? "error"
      : discovery.isDiscovering && !discovery.data
        ? "loading"
        : noteChains.length === 0
          ? "empty"
          : "ready";

  const reset = useCallback(() => {
    filter.reset();
  }, [filter]);

  // ============ RETURN ============

  return {
    status,
    lastError,

    filteredNoteViews,

    activeFilter: filter.activeFilter,
    availableCount: counts.available,
    pendingCount: counts.pending,
    spentCount: counts.spent,
    totalCount: noteChains.length,

    isLoading: discovery.isDiscovering && !discovery.data,
    isRefreshing: discovery.isDiscovering && !!discovery.data,

    availableNotes,

    setFilter: filter.setFilter,
    reset,
  };
}
