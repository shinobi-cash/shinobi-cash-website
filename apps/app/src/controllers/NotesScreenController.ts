/**
 * Notes Screen Controller - UI Layer
 * Manages notes screen UI state (filter, selection)
 * Separate from discovery controller (single responsibility)
 */

import { proxy } from "valtio";
import type { NoteChain } from "@shinobi-cash/core";
import { NoteChainView, NoteFilter, ReadonlyNoteChain } from "@/types/notes";
import {
  filterNoteChains,
  getLastNote,
  sortNoteChainsByTimestamp,
  canWithdraw,
} from "@/utils/noteFiltering";

/**
 * Screen UI state
 */
interface NotesScreenState {
  // UI filter state
  activeFilter: NoteFilter;

  // Selected note chain (domain data for drill-down)
  // NoteChain = Note[] (array representing full deposit history)
  selectedNoteChain: NoteChain | null;
}

const state = proxy<NotesScreenState>({
  activeFilter: "spendable",
  selectedNoteChain: null,
});

/**
 * Selectors - UI-specific derived views
 */
export const NotesScreenSelectors = {
  /**
   * Get filtered note chains based on active filter
   */
  getFilteredNoteChains(
    noteChains: readonly ReadonlyNoteChain[],
    filter: NoteFilter
  ): ReadonlyNoteChain[] {
    return filterNoteChains(noteChains, filter);
  },

  /**
   * Get sorted + filtered view models for UI rendering
   */
  getFilteredNoteViews(
    noteChains: readonly ReadonlyNoteChain[],
    filter: NoteFilter
  ): NoteChainView[] {
    const filtered = filterNoteChains(noteChains, filter);
    const sorted = sortNoteChainsByTimestamp(filtered);

    return sorted.map((chain) => {
      const lastNote = getLastNote(chain);
      return {
        chain: chain as unknown as NoteChain, // domain escape hatch
        lastNote,
        length: chain.length,
        key: `${lastNote.depositIndex}-${lastNote.changeIndex}`,
      };
    });
  },

  /**
   * Get selected note chain
   */
  getSelectedNoteChain: (): NoteChain | null => state.selectedNoteChain,

  /**
   * Get active filter
   */
  getActiveFilter: (): NoteFilter => state.activeFilter,

  /**
   * Check if a note chain can be withdrawn privately
   * Delegates to canWithdraw helper for consistent logic
   */
  canWithdrawFromChain(noteChain: NoteChain): boolean {
    if (!noteChain || noteChain.length === 0) return false;
    const lastNote = noteChain[noteChain.length - 1];
    return canWithdraw(lastNote);
  },
};

/**
 * Notes Screen Controller - Main API
 */
export const NotesScreenController = {
  // Expose state for React adapters (read-only via valtio snapshot)
  state,

  /**
   * Set filter
   */
  setFilter(filter: NoteFilter): void {
    state.activeFilter = filter;
  },

  /**
   * Select note chain (for drill-down)
   */
  selectNoteChain(noteChain: NoteChain): void {
    state.selectedNoteChain = noteChain;
  },

  /**
   * Clear selection
   */
  clearSelection(): void {
    state.selectedNoteChain = null;
  },

  /**
   * Reset all UI state
   */
  reset(): void {
    state.activeFilter = "spendable";
    state.selectedNoteChain = null;
  },
};
