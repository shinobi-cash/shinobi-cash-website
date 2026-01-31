/**
 * Notes Screen Controller Hook
 * Combines discovery controller + screen controller for UI consumption
 *
 * Uses selective subscriptions to minimize re-renders:
 * - Only subscribes to specific properties from each controller
 * - Progress updates during discovery don't trigger re-renders
 */

"use client";

import { useMemo } from "react";
import { useSnapshot } from "valtio";
import type { Note, NoteChain } from "@shinobi-cash/core";
import type { NotesStatus, NotesError, NoteFilter, NoteChainView } from "@/types/notes";
import { useNotesDiscovery } from "./useNotesDiscovery";
import {
  NotesDiscoveryController,
  NotesDiscoverySelectors,
} from "@/controllers/NotesDiscoveryController";
import { NotesScreenController, NotesScreenSelectors } from "@/controllers/NotesScreenController";

/**
 * Public controller interface for notes screen
 */
export interface NotesScreenControllerAPI {
  // Status
  status: NotesStatus;
  lastError: NotesError | null;
  syncError: string | null; // Set when we have cached data but sync failed

  // Filtered views
  filteredNoteViews: NoteChainView[];

  // Filter state
  activeFilter: NoteFilter;
  spendableCount: number;
  pendingCount: number;
  spentCount: number;
  totalCount: number;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;

  // Balance (derived from spendable notes)
  totalBalance: bigint;

  // Spendable notes (can withdraw or ragequit)
  spendableNotes: Note[];

  // Selected note chain (domain data)
  // NoteChain = Note[] (represents full deposit history)
  selectedNoteChain: NoteChain | null;

  // Actions
  setFilter: (filter: NoteFilter) => void;
  selectNoteChain: (noteChain: NoteChain) => void;
  clearSelection: () => void;
  reset: () => void;
}

/**
 * Hook for notes screen UI
 * Combines discovery controller (domain) + screen controller (UI)
 *
 * Uses selective subscriptions - only accesses:
 * - noteChains, state.status, lastError from discovery (not progress)
 * - activeFilter, selectedNoteChain from screen controller
 *
 * @returns Controller interface for notes screen
 */
export function useNotesScreen(): NotesScreenControllerAPI {
  // Selective subscription to discovery controller
  // Only access properties we actually need - excludes progress
  const {
    noteChains,
    state: discoveryState,
    lastError,
  } = useSnapshot(NotesDiscoveryController.state);

  // Selective subscription to screen controller
  const { activeFilter, selectedNoteChain } = useSnapshot(NotesScreenController.state);

  // Trigger the useNotesDiscovery hook for its side effects (transaction refresh)
  useNotesDiscovery();

  const viewState = useMemo(
    () => NotesDiscoverySelectors.getViewState(),
    // Re-compute when discovery state or note chains change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [discoveryState.status, noteChains]
  );

  // Get filtered views (from screen controller)
  const filteredNoteViews = useMemo(
    () => NotesScreenSelectors.getFilteredNoteViews(noteChains, activeFilter),
    [noteChains, activeFilter]
  );

  // Calculate total balance from spendable notes
  const totalBalance = useMemo(() => {
    return viewState.spendableNotes.reduce((total, note) => {
      return total + BigInt(note.amount);
    }, BigInt(0));
  }, [viewState.spendableNotes]);

  return {
    // UI status (from domain)
    status: viewState.status,
    lastError,
    syncError: viewState.syncError,

    // Filtered views
    filteredNoteViews,

    // Filter state
    activeFilter,
    spendableCount: viewState.counts.spendable,
    pendingCount: viewState.counts.pending,
    spentCount: viewState.counts.spent,
    totalCount: viewState.totalCount,

    // Loading states (canonical)
    isLoading: viewState.isLoading,
    isRefreshing: viewState.isRefreshing,

    // Balance
    totalBalance,

    // Spendable notes (canonical)
    spendableNotes: viewState.spendableNotes,

    // Selection
    selectedNoteChain: selectedNoteChain as NoteChain | null,

    // Actions
    setFilter: NotesScreenController.setFilter,
    selectNoteChain: NotesScreenController.selectNoteChain,
    clearSelection: NotesScreenController.clearSelection,
    reset: NotesScreenController.reset,
  };
}
