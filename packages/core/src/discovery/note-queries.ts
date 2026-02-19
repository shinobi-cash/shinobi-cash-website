/**
 * @shinobi-cash/core/discovery
 * Note Query Utilities
 *
 * Pure functions for querying and categorizing notes and trees.
 * These represent core domain logic for the 3-category model.
 */

import type { Note, NoteTree, NoteNode, NoteOrIntent } from "./types.js";
import {
  isNote,
  isIntent,
  isMergedNote,
  isRagequitNote,
  isWithdrawalNote,
  isCrosschainWithdrawalNote,
  isSpendableNote,
  isDepositRefundedNote,
} from "./types.js";
import { getLeafNodes, getSpendableLeaves } from "./tree-utils.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Note category for the 3-category model:
 * - spendable: User can take action NOW (withdraw or ragequit)
 * - pending: Waiting for something (solver fill, ASP approval)
 * - spent: Already used, no action possible
 */
export type NoteCategory = "spendable" | "pending" | "spent";

/**
 * Activity type derived from note type.
 * Used for activity feed display and filtering.
 */
export type ActivityType = "deposit" | "withdrawal" | "refund" | "ragequit";

// ============================================================================
// Helpers
// ============================================================================

/** Check if note is a terminal note (no further actions possible) */
function isTerminalNote(note: Note): boolean {
  return (
    isMergedNote(note) ||
    isRagequitNote(note) ||
    isWithdrawalNote(note) ||
    isCrosschainWithdrawalNote(note) ||
    isDepositRefundedNote(note)
  );
}

/** Check if note has balance and can be acted upon */
function hasActionableBalance(note: Note): boolean {
  if (isTerminalNote(note)) return false;
  if (!isSpendableNote(note)) return false;
  return note.status === "unspent" && BigInt(note.amount) > 0n;
}

// ============================================================================
// Category Determination
// ============================================================================

/**
 * Get the display category for a note.
 *
 * Categories based on what actions the user can take:
 *
 * 1. **Spendable** - Can take action NOW
 *    - ASP approved → Private Withdraw or Ragequit
 *    - WithdrawalRefundedNote (unspent) → Can be withdrawn
 *
 * 2. **Pending** - Waiting for something
 *    - DepositIntentNote with no children (waiting for solver fill)
 *    - WithdrawalIntentNote with no children (waiting for solver or refund)
 *    - ASP pending (waiting for approval, can ragequit)
 *
 * 3. **Spent** - No action possible
 *    - Already withdrawn (status = 'spent')
 *    - Terminal notes (MergedNote, RagequitNote, WithdrawalNote)
 *    - Intent notes with children (filled or refunded)
 */
export function getNoteCategory(note: Note): NoteCategory {
  // Terminal notes are always spent
  if (isTerminalNote(note)) return "spent";

  // Spendable notes: check status and aspStatus
  if (isSpendableNote(note)) {
    if (note.status === "spent") return "spent";
    if (BigInt(note.amount) <= 0n) return "spent";
    if (note.aspStatus === "pending") return "pending";
    return "spendable";
  }

  return "spent";
}

/**
 * Get category for a note node, considering tree context for intents.
 * Intent notes with children are considered "spent" (resolved).
 */
export function getNoteCategoryWithContext(node: NoteNode): NoteCategory {
  const item = node.note;

  // Intents: check children to determine status
  if (isIntent(item)) {
    // If intent has children, it's been resolved (filled or refunded) → spent
    if (node.children.length > 0) {
      return "spent";
    }
    // No children = still pending
    return "pending";
  }

  // For notes, use the basic category function
  return getNoteCategory(item);
}

/**
 * Get all categories present in a tree's leaf nodes.
 * A tree can have multiple categories if it has leaves of different types.
 * For example, after a partial crosschain withdrawal:
 * - ChangeNote (spendable) + WithdrawalIntentNote (pending)
 */
export function getTreeCategories(tree: NoteTree): Set<NoteCategory> {
  const leaves = getLeafNodes(tree);
  const categories = new Set<NoteCategory>();

  for (const leaf of leaves) {
    const category = getNoteCategoryWithContext(leaf);
    categories.add(category);
  }

  return categories;
}

/**
 * Check if a tree matches a specific category.
 * Returns true if ANY leaf in the tree has the given category.
 */
export function treeMatchesCategory(tree: NoteTree, category: NoteCategory): boolean {
  return getTreeCategories(tree).has(category);
}

/**
 * Get tree category based on all leaf nodes.
 * Returns the "primary" category for display purposes:
 * - "spendable" if any leaf is spendable
 * - "pending" if any leaf is pending (and none are spendable)
 * - "spent" if all leaves are spent
 *
 * @deprecated Use getTreeCategories() or treeMatchesCategory() for filtering
 */
export function getTreeCategory(tree: NoteTree): NoteCategory {
  const categories = getTreeCategories(tree);

  if (categories.has("spendable")) return "spendable";
  if (categories.has("pending")) return "pending";
  return "spent";
}

// ============================================================================
// Action Availability
// ============================================================================

/**
 * Check if a note can be withdrawn privately.
 * Requires: ASP approved + has balance + unspent
 */
export function canWithdraw(note: Note): boolean {
  return hasActionableBalance(note) && isSpendableNote(note) && note.aspStatus === "approved";
}

/**
 * Check if a note can be ragequit (emergency public withdrawal).
 * Requires: has balance + unspent (any ASP status)
 */
export function canRagequit(note: Note): boolean {
  return hasActionableBalance(note);
}

// ============================================================================
// Tree Filtering & Sorting
// ============================================================================

/**
 * Filter note trees by category.
 * Returns trees that have ANY leaf matching the given category.
 * A tree can appear in multiple categories (e.g., both spendable and pending).
 */
export function filterNoteTrees(trees: NoteTree[], filter: NoteCategory): NoteTree[] {
  return trees.filter((tree) => treeMatchesCategory(tree, filter));
}

/**
 * Get counts for each category.
 * A tree can be counted in multiple categories if it has leaves of different types.
 * For example, a tree with both a spendable ChangeNote and pending WithdrawalIntentNote
 * will be counted in both spendable and pending.
 */
export function getNoteTreeCounts(trees: NoteTree[]): {
  spendable: number;
  pending: number;
  spent: number;
} {
  const counts = { spendable: 0, pending: 0, spent: 0 };

  for (const tree of trees) {
    const categories = getTreeCategories(tree);
    if (categories.has("spendable")) counts.spendable++;
    if (categories.has("pending")) counts.pending++;
    if (categories.has("spent")) counts.spent++;
  }

  return counts;
}

/**
 * Get the most recent timestamp from a tree.
 * For spent trees, returns the leaf timestamp (when spent).
 * For other trees, returns the root timestamp (when deposited).
 */
function getMostRecentTimestamp(tree: NoteTree): number {
  const category = getTreeCategory(tree);

  if (category === "spent") {
    // For spent trees, find the most recent leaf timestamp
    const leaves = getLeafNodes(tree);
    let maxTimestamp = Number(tree.root.note.originTimestamp);

    for (const leaf of leaves) {
      maxTimestamp = Math.max(maxTimestamp, Number(leaf.note.originTimestamp));
    }

    return maxTimestamp;
  }

  // For spendable/pending, use deposit timestamp
  return Number(tree.root.note.originTimestamp);
}

/**
 * Sort trees by timestamp (most recent first).
 * - Spendable/Pending: sorted by deposit time
 * - Spent: sorted by when they were spent (most recent activity)
 */
export function sortTreesByTimestamp(trees: NoteTree[]): NoteTree[] {
  return [...trees].sort((a, b) => getMostRecentTimestamp(b) - getMostRecentTimestamp(a));
}

// ============================================================================
// Note Extraction
// ============================================================================

/**
 * Get all spendable notes from a tree.
 * Uses category-based filtering (ASP approved = spendable).
 * This handles cases where both ChangeNote AND WithdrawalRefundedNote are spendable.
 */
export function getSpendableNotesFromTree(tree: NoteTree): Note[] {
  const spendableLeaves = getSpendableLeaves(tree);
  return spendableLeaves
    .map((node) => node.note)
    .filter((item): item is Note => isNote(item) && getNoteCategory(item) === "spendable");
}

/**
 * Get all spendable notes from all trees.
 */
export function getSpendableNotes(trees: NoteTree[]): Note[] {
  return trees.flatMap(getSpendableNotesFromTree);
}

/**
 * Get total spendable balance from a tree.
 * Sums balance of ALL spendable notes (category-based) in the tree.
 */
export function getTotalSpendableBalanceByCategory(tree: NoteTree): bigint {
  const spendableNotes = getSpendableNotesFromTree(tree);
  return spendableNotes.reduce((sum, note) => sum + BigInt(note.amount), 0n);
}

/**
 * Get notes that can be withdrawn privately (ASP approved only).
 * This is a subset of spendable notes - excludes ASP pending.
 */
export function getWithdrawableNotes(trees: NoteTree[]): Note[] {
  return getSpendableNotes(trees).filter(canWithdraw);
}
