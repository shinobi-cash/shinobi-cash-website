/**
 * Activity Derivation Utility
 *
 * Converts note chains into activity entries for display.
 */

import type { Note } from "@shinobi-cash/core";
import type { ReadonlyNoteChain } from "@/types/notes";
import type { ActivityEntry, ActivityType } from "@/types/activity";
import { getActivityType, getActivityId } from "@/types/activity";

/**
 * Create an activity entry from a note
 * For withdrawals, pass the previous note to calculate withdrawn amount
 */
function createActivityEntry(note: Note, prevNote?: Note): ActivityEntry {
  const type = getActivityType(note);

  // Calculate display amount:
  // - For withdrawals: prevAmount - currentAmount (what was withdrawn)
  // - For deposits/refunds: the note amount
  const displayAmount =
    type === "withdrawal" && prevNote
      ? (BigInt(prevNote.amount) - BigInt(note.amount)).toString()
      : note.amount;

  return {
    note,
    type,
    displayAmount,
    isCrossChain: note.originChainId !== note.destinationChainId,
  };
}

/**
 * Derive activity entries from note chains
 *
 * Flattens all notes from all chains and converts them to activity entries,
 * sorted by timestamp (newest first).
 */
export function deriveActivitiesFromNoteChains(
  noteChains: readonly ReadonlyNoteChain[]
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const chain of noteChains) {
    for (let i = 0; i < chain.length; i++) {
      const note = chain[i];
      const prevNote = i > 0 ? chain[i - 1] : undefined;
      entries.push(createActivityEntry(note, prevNote));
    }
  }

  // Sort by timestamp descending (newest first)
  return entries.sort((a, b) => {
    const timestampA = Number(a.note.timestamp);
    const timestampB = Number(b.note.timestamp);
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
  };
}

/**
 * Find activity entry by ID
 */
export function findActivityById(entries: ActivityEntry[], id: string): ActivityEntry | undefined {
  return entries.find((e) => getActivityId(e) === id);
}
