/**
 * Note Navigation Utilities
 * Helpers for navigating between notes across trees (UTXO-style navigation)
 */

import type { NoteOrIntent, NoteNode, NoteTree } from "@shinobi-cash/core/discovery";
import { traverseTree, getNoteCategoryWithContext, isNote } from "@shinobi-cash/core/discovery";
import type { NoteCategory } from "@/types/notes";

/**
 * Result of finding a note by serial number
 */
export interface NoteSearchResult {
  note: NoteOrIntent;
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
 * Only matches notes (intents don't have serial numbers)
 */
function findNodeInTree(tree: NoteTree, serialNumber: string): NoteNode | null {
  let found: NoteNode | null = null;

  traverseTree(tree, (node) => {
    const item = node.note;
    if (isNote(item) && item.serialNumber === serialNumber) {
      found = node;
    }
  });

  return found;
}

/**
 * Find a note by its label across all trees.
 * Used to link deposit activities to their resulting notes.
 * Label is unique per deposit and present in both activity and spendable notes.
 */
export function findNoteByLabel(
  label: string,
  allTrees: NoteTree[]
): NoteSearchResult | null {
  for (const tree of allTrees) {
    const result = findNodeByLabel(tree, label);
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

function findNodeByLabel(tree: NoteTree, label: string): NoteNode | null {
  let found: NoteNode | null = null;

  traverseTree(tree, (node) => {
    const item = node.note;
    // Spendable notes have label field
    if (isNote(item) && "label" in item && item.label === label) {
      found = node;
    }
  });

  return found;
}

/**
 * Find a note by its spent nullifier across all trees.
 * Used to link withdrawal activities to the notes they spent.
 * The spent note has activityData.spentNullifier matching the withdrawal's spentNullifiers.
 */
export function findNoteBySpentNullifier(
  nullifier: string,
  allTrees: NoteTree[]
): NoteSearchResult | null {
  for (const tree of allTrees) {
    const result = findNodeBySpentNullifier(tree, nullifier);
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

function findNodeBySpentNullifier(tree: NoteTree, nullifier: string): NoteNode | null {
  let found: NoteNode | null = null;

  traverseTree(tree, (node) => {
    const item = node.note;
    // Check if this note was spent with the given nullifier
    // For Withdraw2, also check spentNullifier1
    if (isNote(item) && (
      item.activityData?.spentNullifier === nullifier ||
      item.activityData?.spentNullifier1 === nullifier
    )) {
      found = node;
    }
  });

  return found;
}

/**
 * Find a note by its commitment across all trees.
 * Used to link withdrawal activities to their change notes via newCommitment.
 */
export function findNoteByCommitment(
  commitment: string,
  allTrees: NoteTree[]
): NoteSearchResult | null {
  for (const tree of allTrees) {
    const result = findNodeByCommitment(tree, commitment);
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

function findNodeByCommitment(tree: NoteTree, commitment: string): NoteNode | null {
  let found: NoteNode | null = null;

  traverseTree(tree, (node) => {
    const item = node.note;
    // Check if this note has the given commitment in activityData
    if (isNote(item) && item.activityData?.commitment === commitment) {
      found = node;
    }
  });

  return found;
}

/**
 * Find a change note by transaction hash across all trees.
 * Used to link withdrawal activities to their change notes.
 */
export function findChangeNoteByTxHash(
  txHash: string,
  allTrees: NoteTree[]
): NoteSearchResult | null {
  for (const tree of allTrees) {
    const result = findChangeNodeByTxHash(tree, txHash);
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

function findChangeNodeByTxHash(tree: NoteTree, txHash: string): NoteNode | null {
  let found: NoteNode | null = null;

  traverseTree(tree, (node) => {
    const item = node.note;
    // Check if this is a change note created by the given transaction
    if (isNote(item) && item.noteType === "change" && item.originTransactionHash === txHash) {
      found = node;
    }
  });

  return found;
}

/**
 * Find a withdrawal intent by transaction hash across all trees.
 * Used to find the source note for cross-chain withdrawals.
 */
export function findWithdrawalIntentByTxHash(
  txHash: string,
  allTrees: NoteTree[]
): NoteSearchResult | null {
  for (const tree of allTrees) {
    const result = findIntentNodeByTxHash(tree, txHash);
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

function findIntentNodeByTxHash(tree: NoteTree, txHash: string): NoteNode | null {
  let found: NoteNode | null = null;

  traverseTree(tree, (node) => {
    const item = node.note;
    // Check if this is a withdrawal intent created by the given transaction
    if (!isNote(item) && "intentType" in item && item.intentType === "withdrawalIntent" && item.originTransactionHash === txHash) {
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
 * Only spendable + pending - spent notes are viewed via Activity tab.
 */
export function getNoteCounts(allTrees: NoteTree[]): {
  spendable: number;
  pending: number;
} {
  const all = flattenAllNotes(allTrees);
  return {
    spendable: all.filter((e) => e.category === "spendable").length,
    pending: all.filter((e) => e.category === "pending").length,
  };
}
