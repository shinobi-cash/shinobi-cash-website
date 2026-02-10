/**
 * @shinobi-cash/core/discovery
 * Note Query Utilities
 *
 * Pure functions for querying and categorizing notes and trees.
 * These represent core domain logic for the 3-category model.
 */

import type { Note, NoteTree, NoteNode } from './types.js';
import {
  isIntentNote,
  isMergedNote,
  isRagequitNote,
  isWithdrawalNote,
  isCrosschainWithdrawalNote,
  isSpendableNote,
  isDepositRefundedNote,
} from './types.js';
import { getLeafNodes, getSpendableLeaves } from './tree-utils.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Note category for the 3-category model:
 * - spendable: User can take action NOW (withdraw or ragequit)
 * - pending: Waiting for something (solver fill, ASP approval)
 * - spent: Already used, no action possible
 */
export type NoteCategory = 'spendable' | 'pending' | 'spent';

/**
 * Activity type derived from note type.
 * Used for activity feed display and filtering.
 */
export type ActivityType = 'deposit' | 'withdrawal' | 'refund' | 'ragequit';

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
  if (isIntentNote(note)) return false;
  if (isTerminalNote(note)) return false;
  if (!isSpendableNote(note)) return false;
  return note.status === 'unspent' && BigInt(note.amount) > 0n;
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
 *    - ASP rejected → Ragequit only
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
  // Intent notes: treat as pending (tree context needed for accurate status)
  if (isIntentNote(note)) return 'pending';

  // Terminal notes are always spent
  if (isTerminalNote(note)) return 'spent';

  // Spendable notes: check status and aspStatus
  if (isSpendableNote(note)) {
    if (note.status === 'spent') return 'spent';
    if (BigInt(note.amount) <= 0n) return 'spent';
    if (note.aspStatus === 'pending') return 'pending';
    return 'spendable';
  }

  return 'spent';
}

/**
 * Get category for a note node, considering tree context for intents.
 * Intent notes with children are considered "spent" (resolved).
 */
export function getNoteCategoryWithContext(node: NoteNode): NoteCategory {
  const note = node.note;

  // Intent notes: check children to determine status
  if (isIntentNote(note)) {
    // If intent has children, it's been resolved (filled or refunded) → spent
    if (node.children.length > 0) {
      return 'spent';
    }
    // No children = still pending
    return 'pending';
  }

  // For other notes, use the basic category function
  return getNoteCategory(note);
}

/**
 * Get tree category based on all leaf nodes.
 * A tree is:
 * - "spendable" if any leaf is spendable
 * - "pending" if any leaf is pending (and none are spendable)
 * - "spent" if all leaves are spent
 */
export function getTreeCategory(tree: NoteTree): NoteCategory {
  const leaves = getLeafNodes(tree);

  let hasSpendable = false;
  let hasPending = false;

  for (const leaf of leaves) {
    const category = getNoteCategoryWithContext(leaf);
    if (category === 'spendable') hasSpendable = true;
    if (category === 'pending') hasPending = true;
  }

  if (hasSpendable) return 'spendable';
  if (hasPending) return 'pending';
  return 'spent';
}

// ============================================================================
// Action Availability
// ============================================================================

/**
 * Check if a note can be withdrawn privately.
 * Requires: ASP approved + has balance + unspent
 */
export function canWithdraw(note: Note): boolean {
  return hasActionableBalance(note) && isSpendableNote(note) && note.aspStatus === 'approved';
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
 */
export function filterNoteTrees(trees: NoteTree[], filter: NoteCategory): NoteTree[] {
  return trees.filter((tree) => getTreeCategory(tree) === filter);
}

/**
 * Get counts for each category.
 */
export function getNoteTreeCounts(trees: NoteTree[]): {
  spendable: number;
  pending: number;
  spent: number;
} {
  return trees.reduce(
    (counts, tree) => {
      const category = getTreeCategory(tree);
      if (category === 'spendable') counts.spendable++;
      else if (category === 'pending') counts.pending++;
      else counts.spent++;
      return counts;
    },
    { spendable: 0, pending: 0, spent: 0 },
  );
}

/**
 * Get the most recent timestamp from a tree.
 * For spent trees, returns the leaf timestamp (when spent).
 * For other trees, returns the root timestamp (when deposited).
 */
function getMostRecentTimestamp(tree: NoteTree): number {
  const category = getTreeCategory(tree);

  if (category === 'spent') {
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
  return spendableLeaves.map((node) => node.note).filter((note) => getNoteCategory(note) === 'spendable');
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
 * This is a subset of spendable notes - excludes ASP rejected/pending.
 */
export function getWithdrawableNotes(trees: NoteTree[]): Note[] {
  return getSpendableNotes(trees).filter(canWithdraw);
}

