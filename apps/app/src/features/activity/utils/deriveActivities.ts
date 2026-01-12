/**
 * Activity Derivation Utility
 *
 * Converts note chains into a flat list of activities sorted by timestamp.
 */

import type { NoteChain, Note } from "@shinobi-cash/core";
import type { Activity, ActivityType } from "../types";
import { ReadonlyNoteChain } from "@/features/notes/types";

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
 */
function noteToActivity(note: Note): Activity {
  return {
    id: `${note.depositIndex}-${note.changeIndex}`,
    type: getActivityType(note),
    amount: note.amount,
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
 */
export function deriveActivitiesFromNoteChains(noteChains: readonly ReadonlyNoteChain[]): Activity[] {
  const activities: Activity[] = [];

  // Flatten all notes from all chains
  for (const chain of noteChains) {
    for (const note of chain) {
      activities.push(noteToActivity(note));
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
