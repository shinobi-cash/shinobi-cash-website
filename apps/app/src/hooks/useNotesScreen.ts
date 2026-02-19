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
import type { Note, NoteNode, NoteTree } from "@shinobi-cash/core/discovery";
import type { NotesStatus, NotesError, NoteFilter } from "@/types/notes";
import type { NoteView } from "@/controllers/NotesScreenController";
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

  // Filtered views (individual notes, not trees)
  filteredNoteViews: NoteView[];

  // All trees (for navigation across trees)
  allTrees: NoteTree[];

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

  // Selected note (UTXO-style)
  selectedNote: Note | null;
  selectedNoteNode: NoteNode | null;

  // Actions
  setFilter: (filter: NoteFilter) => void;
  selectNote: (note: Note, node: NoteNode) => void;
  clearSelection: () => void;
  reset: () => void;
}

/**
 * Hook for notes screen UI
 * Combines discovery controller (domain) + screen controller (UI)
 *
 * Uses selective subscriptions - only accesses:
 * - noteTrees, state.status, lastError from discovery (not progress)
 * - activeFilter, selectedNote from screen controller
 *
 * @returns Controller interface for notes screen
 */
export function useNotesScreen(): NotesScreenControllerAPI {
  // Selective subscription to discovery controller
  // Only access properties we actually need - excludes progress
  const {
    noteTrees,
    state: discoveryState,
    lastError,
  } = useSnapshot(NotesDiscoveryController.state);

  // Selective subscription to screen controller
  const { activeFilter, selectedNote, selectedNoteNode } = useSnapshot(NotesScreenController.state);

  // Trigger the useNotesDiscovery hook for its side effects (transaction refresh)
  useNotesDiscovery();

  const viewState = useMemo(
    () => NotesDiscoverySelectors.getViewState(),
    // Re-compute when discovery state or note trees change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [discoveryState.status, noteTrees]
  );

  // Get filtered views (individual notes)
  const filteredNoteViews = useMemo(
    () => NotesScreenSelectors.getFilteredNoteViews(noteTrees as NoteTree[], activeFilter),
    [noteTrees, activeFilter]
  );

  // Get counts (individual notes)
  const noteCounts = useMemo(
    () => NotesScreenSelectors.getNoteCounts(noteTrees as NoteTree[]),
    [noteTrees]
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

    // Filtered views (individual notes)
    filteredNoteViews,

    // All trees for navigation
    allTrees: noteTrees as NoteTree[],

    // Filter state (using individual note counts)
    activeFilter,
    spendableCount: noteCounts.spendable,
    pendingCount: noteCounts.pending,
    spentCount: noteCounts.spent,
    totalCount: noteCounts.spendable + noteCounts.pending + noteCounts.spent,

    // Loading states (canonical)
    isLoading: viewState.isLoading,
    isRefreshing: viewState.isRefreshing,

    // Balance
    totalBalance,

    // Spendable notes (canonical)
    spendableNotes: viewState.spendableNotes,

    // Selection (UTXO-style)
    selectedNote: selectedNote as Note | null,
    selectedNoteNode: selectedNoteNode as NoteNode | null,

    // Actions
    setFilter: NotesScreenController.setFilter,
    selectNote: NotesScreenController.selectNote,
    clearSelection: NotesScreenController.clearSelection,
    reset: NotesScreenController.reset,
  };
}
