/**
 * Notes Screen Controller - UI Layer
 * Manages notes screen UI state (filter, selection)
 * Separate from discovery controller (single responsibility)
 */

import { proxy } from "valtio";
import type { NoteTree } from "@shinobi-cash/core/discovery";
import {
  getSpendableLeaves,
  filterNoteTrees,
  sortTreesByTimestamp,
  canWithdraw,
} from "@shinobi-cash/core/discovery";
import { NoteTreeView, NoteFilter } from "@/types/notes";

/**
 * Screen UI state
 */
interface NotesScreenState {
  // UI filter state
  activeFilter: NoteFilter;

  // Selected note tree (domain data for drill-down)
  selectedNoteTree: NoteTree | null;
}

const state = proxy<NotesScreenState>({
  activeFilter: "spendable",
  selectedNoteTree: null,
});

/**
 * Selectors - UI-specific derived views
 */
export const NotesScreenSelectors = {
  /**
   * Get filtered note trees based on active filter
   */
  getFilteredNoteTrees(trees: NoteTree[], filter: NoteFilter): NoteTree[] {
    return filterNoteTrees(trees, filter);
  },

  /**
   * Get sorted + filtered view models for UI rendering
   */
  getFilteredNoteViews(trees: NoteTree[], filter: NoteFilter): NoteTreeView[] {
    const filtered = filterNoteTrees(trees, filter);
    const sorted = sortTreesByTimestamp(filtered);

    return sorted.map((tree) => {
      const rootNote = tree.root.note;
      return {
        tree,
        key: `${rootNote.originChainId}-${rootNote.depositIndex}`,
      };
    });
  },

  /**
   * Get selected note tree
   */
  getSelectedNoteTree: (): NoteTree | null => state.selectedNoteTree,

  /**
   * Get active filter
   */
  getActiveFilter: (): NoteFilter => state.activeFilter,

  /**
   * Check if a note tree can be withdrawn privately
   * Returns true if any spendable leaf can be withdrawn
   */
  canWithdrawFromTree(tree: NoteTree): boolean {
    if (!tree) return false;
    const spendableLeaves = getSpendableLeaves(tree);
    return spendableLeaves.some((node) => canWithdraw(node.note));
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
   * Select note tree (for drill-down)
   */
  selectNoteTree(tree: NoteTree): void {
    state.selectedNoteTree = tree;
  },

  /**
   * Clear selection
   */
  clearSelection(): void {
    state.selectedNoteTree = null;
  },

  /**
   * Reset all UI state
   */
  reset(): void {
    state.activeFilter = "spendable";
    state.selectedNoteTree = null;
  },
};
