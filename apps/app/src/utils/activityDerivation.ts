/**
 * Activity Derivation Utility
 *
 * Converts note chains into a flat list of activities sorted by timestamp.
 */

import type { Note } from "@shinobi-cash/core";
import { ReadonlyNoteChain } from "@/types/notes";
import { Activity, ActivityType } from "@/types/activity";

/**
 * Derive activity type from note
 */
function getActivityType(note: Note): ActivityType {
  if (note.noteType === "deposit") return "deposit";
  if (note.noteType === "refund") return "refund";
  return "withdrawal"; // changeNote
}

/**
 * Convert a single note to an activity
 * For withdrawals, pass the previous note to calculate withdrawn amount
 */
function noteToActivity(note: Note, prevNote?: Note): Activity {
  const type = getActivityType(note);

  // For withdrawals, calculate the actual withdrawn amount (prevAmount - currentAmount)
  // For deposits/refunds, use the note amount directly
  const amount =
    type === "withdrawal" && prevNote
      ? (BigInt(prevNote.amount) - BigInt(note.amount)).toString()
      : note.amount;

  return {
    id: `${note.depositIndex}-${note.changeIndex}`,
    type,
    amount,
    timestamp: note.timestamp,
    blockNumber: note.blockNumber,
    status: note.status,
    aspStatus: note.aspStatus,
    isActivated: note.isActivated,
    originTransactionHash: note.originTransactionHash,
    destinationTransactionHash: note.destinationTransactionHash,
    originChainId: note.originChainId,
    destinationChainId: note.destinationChainId,
    isCrossChain: note.originChainId !== note.destinationChainId,
    poolAddress: note.poolAddress,
    depositIndex: note.depositIndex,
    changeIndex: note.changeIndex,
    label: note.label,
  };
}

/**
 * Derive activities from note chains
 *
 * Flattens all notes from all chains and converts them to activities,
 * sorted by timestamp (newest first).
 *
 * For withdrawals, calculates the actual withdrawn amount by comparing
 * with the previous note in the chain.
 */
export function deriveActivitiesFromNoteChains(
  noteChains: readonly ReadonlyNoteChain[]
): Activity[] {
  const activities: Activity[] = [];

  // Process each chain, tracking previous note for withdrawal amount calculation
  for (const chain of noteChains) {
    for (let i = 0; i < chain.length; i++) {
      const note = chain[i];
      const prevNote = i > 0 ? chain[i - 1] : undefined;
      activities.push(noteToActivity(note, prevNote));
    }
  }

  // Sort by timestamp descending (newest first)
  return activities.sort((a, b) => {
    const timestampA = Number(a.timestamp);
    const timestampB = Number(b.timestamp);
    return timestampB - timestampA;
  });
}

/**
 * Filter activities by type
 */
export function filterActivitiesByType(
  activities: Activity[],
  filter: "all" | ActivityType
): Activity[] {
  if (filter === "all") return activities;
  return activities.filter((activity) => activity.type === filter);
}

/**
 * Get activity counts by type
 */
export function getActivityCounts(activities: Activity[]) {
  return {
    total: activities.length,
    deposit: activities.filter((a) => a.type === "deposit").length,
    withdrawal: activities.filter((a) => a.type === "withdrawal").length,
    refund: activities.filter((a) => a.type === "refund").length,
  };
}
