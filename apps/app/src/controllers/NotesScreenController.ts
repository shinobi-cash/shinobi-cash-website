/**
 * Notes Screen Controller - UI Layer
 * Manages notes screen UI state (filter, selection)
 * Separate from discovery controller (single responsibility)
 */

import { proxy } from "valtio";
import type { Note, NoteNode, NoteTree } from "@shinobi-cash/core/discovery";
import {
  getSpendableLeaves,
  canWithdraw,
  traverseTree,
  getNoteCategoryWithContext,
} from "@shinobi-cash/core/discovery";
import type { NoteFilter, NoteCategory } from "@/types/notes";

/**
 * View model for individual note display
 */
export interface NoteView {
  note: Note;
  node: NoteNode;
  tree: NoteTree;
  category: NoteCategory;
  key: string;
}

/**
 * Screen UI state
 */
interface NotesScreenState {
  // UI filter state
  activeFilter: NoteFilter;

  // Selected note for drill-down (UTXO-style)
  selectedNote: Note | null;
  selectedNoteNode: NoteNode | null;
}

const state = proxy<NotesScreenState>({
  activeFilter: "spendable",
  selectedNote: null,
  selectedNoteNode: null,
});

/**
 * Flatten all notes from all trees into individual NoteViews
 */
function flattenNotesToViews(trees: NoteTree[]): NoteView[] {
  const views: NoteView[] = [];

  for (const tree of trees) {
    traverseTree(tree, (node) => {
      const category = getNoteCategoryWithContext(node);
      views.push({
        note: node.note,
        node,
        tree,
        category,
        key: node.note.serialNumber,
      });
    });
  }

  return views;
}

/**
 * Selectors - UI-specific derived views
 */
export const NotesScreenSelectors = {
  /**
   * Get all notes as flat list with their categories
   */
  getAllNoteViews(trees: NoteTree[]): NoteView[] {
    return flattenNotesToViews(trees);
  },

  /**
   * Get filtered note views based on active filter
   */
  getFilteredNoteViews(trees: NoteTree[], filter: NoteFilter): NoteView[] {
    const allViews = flattenNotesToViews(trees);
    const filtered = allViews.filter((view) => view.category === filter);

    // Sort by timestamp (most recent first)
    return filtered.sort((a, b) => {
      const tsA = BigInt(a.note.originTimestamp);
      const tsB = BigInt(b.note.originTimestamp);
      return tsA > tsB ? -1 : tsA < tsB ? 1 : 0;
    });
  },

  /**
   * Get counts by category
   */
  getNoteCounts(trees: NoteTree[]): { spendable: number; pending: number; spent: number } {
    const allViews = flattenNotesToViews(trees);
    return {
      spendable: allViews.filter((v) => v.category === "spendable").length,
      pending: allViews.filter((v) => v.category === "pending").length,
      spent: allViews.filter((v) => v.category === "spent").length,
    };
  },

  /**
   * Get selected note
   */
  getSelectedNote: (): Note | null => state.selectedNote,

  /**
   * Get selected note node
   */
  getSelectedNoteNode: (): NoteNode | null => state.selectedNoteNode,

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
   * Select individual note (UTXO-style)
   */
  selectNote(note: Note, node: NoteNode): void {
    state.selectedNote = note;
    state.selectedNoteNode = node;
  },

  /**
   * Clear selection
   */
  clearSelection(): void {
    state.selectedNote = null;
    state.selectedNoteNode = null;
  },

  /**
   * Reset all UI state
   */
  reset(): void {
    state.activeFilter = "spendable";
    state.selectedNote = null;
    state.selectedNoteNode = null;
  },
};
