import type { Note, NoteChain } from "@shinobi-cash/core";
import type { NoteFilter, ReadonlyNoteChain } from "@/types/notes";

/**
 * Note Filtering Utilities
 *
 * Notes have three possible states based on available actions:
 * 1. Available - can withdraw privately (in pool + ASP approved)
 * 2. Pending - waiting for something (solver fill or ASP approval)
 * 3. Spent - already withdrawn
 *
 * For pending notes, we distinguish the reason:
 * - waitingForSolver: Cross-chain intent not filled yet
 * - awaitingApproval: In pool, ASP status is pending
 * - rejected: In pool, ASP rejected (can only ragequit)
 */

export type PendingReason = "waitingForSolver" | "awaitingApproval" | "rejected";

export function getLastNote(noteChain: ReadonlyNoteChain): Note {
  if (noteChain.length === 0) {
    throw new Error("Invariant violation: empty NoteChain");
  }
  return noteChain[noteChain.length - 1];
}

/**
 * Action-based state helpers
 * Determine what actions are available for a note.
 */

/** Can withdraw privately (in pool + ASP approved) */
export function canWithdraw(note: Note): boolean {
  return (
    note.status === "unspent" &&
    note.isActivated &&
    note.aspStatus === "approved" &&
    BigInt(note.amount) > BigInt(0)
  );
}

/** Can ragequit - exit without privacy (in pool but ASP not approved) */
export function canRagequit(note: Note): boolean {
  return (
    note.status === "unspent" &&
    note.isActivated &&
    note.aspStatus !== "approved" &&
    BigInt(note.amount) > BigInt(0)
  );
}

/** Cross-chain deposit waiting for solver to fill (not in pool yet) */
export function isWaitingForSolver(note: Note): boolean {
  return note.status === "unspent" && note.isCrossChain && !note.isActivated;
}

/** In pool but ASP status is pending (not yet approved or rejected) */
export function isAwaitingApproval(note: Note): boolean {
  return note.status === "unspent" && note.isActivated && note.aspStatus === "pending";
}

/** In pool but ASP status is rejected (can only ragequit) */
export function isAspRejected(note: Note): boolean {
  return note.status === "unspent" && note.isActivated && note.aspStatus === "rejected";
}

/**
 * Get the specific reason why a note is pending.
 * Returns null if note is not pending.
 */
export function getPendingReason(note: Note): PendingReason | null {
  if (note.status !== "unspent") return null;

  // Cross-chain not filled yet
  if (note.isCrossChain && !note.isActivated) {
    return "waitingForSolver";
  }

  // In pool but ASP pending
  if (note.isActivated && note.aspStatus === "pending") {
    return "awaitingApproval";
  }

  // In pool but ASP rejected
  if (note.isActivated && note.aspStatus === "rejected") {
    return "rejected";
  }

  return null;
}

/**
 * Filter state helpers
 * Used for categorizing notes in the UI filters.
 */

/** Note can be used for private withdrawal */
export function isNoteAvailable(note: Note): boolean {
  return canWithdraw(note);
}

/**
 * Note is pending - either:
 * - Cross-chain waiting for solver fill
 * - In pool but ASP pending
 * - In pool but ASP rejected (needs ragequit)
 */
export function isNotePending(note: Note): boolean {
  if (note.status !== "unspent") return false;

  // Not in pool yet (waiting for solver)
  if (!note.isActivated) return true;

  // In pool but not approved (pending or rejected)
  if (note.aspStatus !== "approved") return true;

  // In pool and approved but zero balance
  if (BigInt(note.amount) <= BigInt(0)) return false;

  return false;
}

export function isNoteSpent(note: Note): boolean {
  return note.status === "spent";
}

/**
 * Filter note chains by category
 */
export function filterNoteChains(
  noteChains: readonly ReadonlyNoteChain[],
  filter: NoteFilter
): ReadonlyNoteChain[] {
  return noteChains.filter((noteChain) => {
    const lastNote = getLastNote(noteChain);

    switch (filter) {
      case "available":
        return isNoteAvailable(lastNote);
      case "pending":
        return isNotePending(lastNote);
      case "spent":
        return isNoteSpent(lastNote);
      default:
        return false;
    }
  });
}

export function countNoteChains(noteChains: NoteChain[], filter: NoteFilter): number {
  return filterNoteChains(noteChains, filter).length;
}

export function getNoteChainCounts(noteChains: NoteChain[]): {
  available: number;
  pending: number;
  spent: number;
} {
  return noteChains.reduce(
    (counts, noteChain) => {
      const lastNote = getLastNote(noteChain);

      if (isNoteAvailable(lastNote)) {
        counts.available++;
      } else if (isNotePending(lastNote)) {
        counts.pending++;
      } else if (isNoteSpent(lastNote)) {
        counts.spent++;
      }

      return counts;
    },
    { available: 0, pending: 0, spent: 0 }
  );
}

export function sortNoteChainsByTimestamp(noteChains: ReadonlyNoteChain[]): ReadonlyNoteChain[] {
  return [...noteChains].sort((a, b) => {
    const lastNoteA = getLastNote(a);
    const lastNoteB = getLastNote(b);
    return Number(lastNoteB.timestamp) - Number(lastNoteA.timestamp);
  });
}

export function getAvailableNoteChains(noteChains: ReadonlyNoteChain[]): ReadonlyNoteChain[] {
  return filterNoteChains(noteChains, "available");
}

export function getAvailableNotes(noteChains: NoteChain[]): Note[] {
  return getAvailableNoteChains(noteChains).map(getLastNote);
}
