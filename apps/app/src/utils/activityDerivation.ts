/**
 * Activity Derivation Utility
 *
 * Converts note trees into activity entries for display.
 */

import type { Note, NoteTree } from "@shinobi-cash/core/discovery";
import { traverseTree } from "@shinobi-cash/core/discovery";
import type { ActivityEntry, ActivityType } from "@/types/activity";
import { getActivityType, getActivityId } from "@/types/activity";

/**
 * Check if a note should be shown in activity list.
 * Skip:
 * - Merged notes (secondary chain in Withdraw2) - already counted in winner's activity
 * - WithdrawalIntentNote - the ChangeNote sibling represents the withdrawal
 */
function shouldShowInActivity(note: Note): boolean {
  // Skip merged notes (loser chain in Withdraw2)
  if (note.status === "merged") return false;
  // Skip withdrawal intents - ChangeNote represents the withdrawal
  if (note.noteType === "withdrawalIntent") return false;
  return true;
}

/**
 * Check if a note has a ragequit action
 */
function hasRagequitAction(note: Note): boolean {
  return note.status === "ragequit" && !!note.activityData.ragequitTxHash;
}

/**
 * Create a ragequit activity entry from a note
 */
function createRagequitEntry(note: Note): ActivityEntry {
  // Use ragequitAmount (stored before zeroing) or fallback to note.amount
  const ragequitAmount = note.activityData.ragequitAmount || note.amount;
  return {
    note,
    type: "ragequit",
    displayAmount: ragequitAmount,
    isCrossChain: false, // Ragequit always happens on pool chain
    displayTimestamp: note.activityData.ragequitTimestamp || note.timestamp,
  };
}

/**
 * Create an activity entry from a note
 * For withdrawals, pass the previous note to calculate withdrawn amount
 */
function createActivityEntry(note: Note, prevNote?: Note): ActivityEntry {
  const type = getActivityType(note);

  // Calculate display amount:
  // - For withdrawals: use withdrawnAmount from activity if available
  // - For deposits/refunds: the note amount
  // Always use absolute value since UI adds +/- prefix
  let displayAmount: string;
  if (type === "withdrawal") {
    // Prefer withdrawnAmount (actual withdrawn from activity.amount)
    if (note.activityData.withdrawnAmount) {
      displayAmount = note.activityData.withdrawnAmount;
    } else if (prevNote) {
      // Fallback: calculate from parent - note (only works for 1:1 withdrawals)
      const calculated = BigInt(prevNote.amount) - BigInt(note.amount);
      displayAmount = (calculated < BigInt(0) ? -calculated : calculated).toString();
    } else {
      displayAmount = note.amount;
    }
  } else {
    displayAmount = note.amount;
  }

  return {
    note,
    type,
    displayAmount,
    // Use note.isCrossChain flag (set correctly based on activity type)
    isCrossChain: note.isCrossChain,
    // Include parent amount for debugging
    parentAmount: prevNote?.amount,
  };
}

/**
 * Derive activity entries from note trees
 *
 * Traverses all trees and converts notes to activity entries,
 * sorted by timestamp (newest first).
 */
export function deriveActivitiesFromNoteTrees(
  noteTrees: NoteTree[]
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const tree of noteTrees) {
    traverseTree(tree, (node) => {
      const note = node.note;
      // Skip notes that shouldn't appear in activity list
      if (!shouldShowInActivity(note)) return;

      const parentNote = node.parent?.note;
      entries.push(createActivityEntry(note, parentNote));

      // Add separate entry for ragequit action
      if (hasRagequitAction(note)) {
        entries.push(createRagequitEntry(note));
      }
    });
  }

  // Sort by timestamp descending (newest first)
  // Use displayTimestamp if available (for ragequit entries), otherwise use note.timestamp
  return entries.sort((a, b) => {
    const timestampA = Number(a.displayTimestamp ?? a.note.timestamp);
    const timestampB = Number(b.displayTimestamp ?? b.note.timestamp);
    return timestampB - timestampA;
  });
}

/**
 * Filter activity entries by type
 */
export function filterActivitiesByType(
  entries: ActivityEntry[],
  filter: "all" | ActivityType
): ActivityEntry[] {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.type === filter);
}

/**
 * Get activity counts by type
 */
export function getActivityCounts(entries: ActivityEntry[]) {
  return {
    total: entries.length,
    deposit: entries.filter((e) => e.type === "deposit").length,
    withdrawal: entries.filter((e) => e.type === "withdrawal").length,
    refund: entries.filter((e) => e.type === "refund").length,
    ragequit: entries.filter((e) => e.type === "ragequit").length,
  };
}

/**
 * Find activity entry by ID
 */
export function findActivityById(entries: ActivityEntry[], id: string): ActivityEntry | undefined {
  return entries.find((e) => getActivityId(e) === id);
}
