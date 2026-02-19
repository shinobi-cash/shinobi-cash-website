/**
 * Note Navigation Utilities
 * Helpers for navigating between notes across trees (UTXO-style navigation)
 */

import type { Note, NoteNode, NoteTree } from "@shinobi-cash/core/discovery";
import { traverseTree, getNoteCategoryWithContext } from "@shinobi-cash/core/discovery";
import type { NoteCategory } from "@/types/notes";

/**
 * Result of finding a note by serial number
 */
export interface NoteSearchResult {
  note: Note;
  node: NoteNode;
  tree: NoteTree;
}

/**
 * Find a note node by serial number across all trees.
 * Used for UTXO-style navigation between notes.
 */
export function findNoteBySerial(
  serialNumber: string,
  allTrees: NoteTree[]
): NoteSearchResult | null {
  for (const tree of allTrees) {
    const result = findNodeInTree(tree, serialNumber);
    if (result) {
      return {
        note: result.note,
        node: result,
        tree,
      };
    }
  }

  return null;
}

/**
 * Helper to find a node in a single tree by serial number
 */
function findNodeInTree(tree: NoteTree, serialNumber: string): NoteNode | null {
  let found: NoteNode | null = null;

  traverseTree(tree, (node) => {
    if (node.note.serialNumber === serialNumber) {
      found = node;
    }
  });

  return found;
}

/**
 * Collect all note nodes from all trees, flattened into a single array.
 * Each entry includes the node and its tree for context.
 */
export interface FlattenedNoteEntry {
  node: NoteNode;
  tree: NoteTree;
  category: NoteCategory;
}

export function flattenAllNotes(allTrees: NoteTree[]): FlattenedNoteEntry[] {
  const entries: FlattenedNoteEntry[] = [];

  for (const tree of allTrees) {
    traverseTree(tree, (node) => {
      const category = getNoteCategoryWithContext(node);
      entries.push({ node, tree, category });
    });
  }

  return entries;
}

/**
 * Get all notes of a specific category across all trees.
 */
export function getNotesByCategory(
  allTrees: NoteTree[],
  category: NoteCategory
): FlattenedNoteEntry[] {
  return flattenAllNotes(allTrees).filter((entry) => entry.category === category);
}

/**
 * Sort notes by timestamp (most recent first by default).
 */
export function sortNotesByTimestamp(
  entries: FlattenedNoteEntry[],
  direction: "asc" | "desc" = "desc"
): FlattenedNoteEntry[] {
  return [...entries].sort((a, b) => {
    const tsA = BigInt(a.node.note.originTimestamp);
    const tsB = BigInt(b.node.note.originTimestamp);
    const diff = tsA - tsB;
    const zero = BigInt(0);
    return direction === "desc" ? (diff > zero ? -1 : diff < zero ? 1 : 0) : diff > zero ? 1 : diff < zero ? -1 : 0;
  });
}

/**
 * Get counts of notes by category.
 */
export function getNoteCounts(allTrees: NoteTree[]): {
  spendable: number;
  pending: number;
  spent: number;
} {
  const all = flattenAllNotes(allTrees);
  return {
    spendable: all.filter((e) => e.category === "spendable").length,
    pending: all.filter((e) => e.category === "pending").length,
    spent: all.filter((e) => e.category === "spent").length,
  };
}
