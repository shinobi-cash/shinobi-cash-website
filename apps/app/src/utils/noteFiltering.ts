import type { Note, NoteChain } from "@shinobi-cash/core/discovery";
import type { NoteFilter, NoteCategory, ReadonlyNoteChain } from "@/types/notes";

/**
 * Note Filtering Utilities - 3-Category Model
 *
 * Categories based on what actions the user can take:
 *
 * 1. **Spendable** - Can take action NOW
 *    - ASP approved → Private Withdraw or Ragequit
 *    - ASP rejected → Ragequit only
 *
 * 2. **Pending** - Waiting for something
 *    - Cross-chain intent not filled (waiting for solver)
 *    - Cross-chain intent expired (can claim refund)
 *    - ASP pending (waiting for approval, can ragequit)
 *
 * 3. **Spent** - No action possible
 *    - Already withdrawn (status = 'spent')
 *    - Cross-chain intent refunded (intentStatus = 'refunded')
 *
 * Key fields:
 * - status: 'unspent' | 'spent' - spending status
 * - aspStatus: 'pending' | 'approved' | 'rejected' - compliance status
 * - intentStatus: 'pending' | 'filled' | 'refunded' - cross-chain intent
 * - expires: unix timestamp when refund becomes available (cross-chain only)
 */

export function getLastNote(noteChain: ReadonlyNoteChain): Note {
  if (noteChain.length === 0) {
    throw new Error("Invariant violation: empty NoteChain");
  }
  return noteChain[noteChain.length - 1];
}

/**
 * Check if note is in the pool (can be used for withdrawals/ragequit)
 * - Same-chain: always in pool
 * - Cross-chain: in pool when intent is filled
 */
export function isInPool(note: Note): boolean {
  return !note.isCrossChain || note.intentStatus === "filled";
}

// ============================================
// CATEGORY DETERMINATION
// ============================================

/**
 * Get the display category for a note
 * This determines which tab the note appears in
 */
export function getNoteCategory(note: Note): NoteCategory {
  // Spent: Already used or refunded
  if (note.status === "spent") return "spent";
  if (note.intentStatus === "refunded") return "spent";

  // Zero balance is effectively spent
  if (BigInt(note.amount) <= BigInt(0)) return "spent";

  // Pending: Not in pool yet (cross-chain waiting for solver)
  if (!isInPool(note)) return "pending";

  // Pending: In pool but ASP hasn't decided
  if (note.aspStatus === "pending") return "pending";

  // Spendable: In pool with ASP decision (approved or rejected)
  // - Approved: can withdraw privately or ragequit
  // - Rejected: can only ragequit
  return "spendable";
}

// ============================================
// ACTION AVAILABILITY
// ============================================

/** Can withdraw privately (in pool + ASP approved + has balance) */
export function canWithdraw(note: Note): boolean {
  return (
    note.status === "unspent" &&
    isInPool(note) &&
    note.aspStatus === "approved" &&
    BigInt(note.amount) > BigInt(0)
  );
}

/**
 * Can ragequit - emergency exit bypassing privacy
 * Available for all notes in pool with balance, regardless of ASP status
 * (Contract only checks: depositor match, valid proof, commitment exists)
 */
export function canRagequit(note: Note): boolean {
  return note.status === "unspent" && isInPool(note) && BigInt(note.amount) > BigInt(0);
}

/**
 * Can claim refund for expired cross-chain intent
 * Available when intent is pending and current time > expires
 */
export function canClaimRefund(note: Note): boolean {
  if (note.status !== "unspent") return false;
  if (note.intentStatus !== "pending") return false;
  if (!note.expires) return false;

  const now = Math.floor(Date.now() / 1000);
  return now > Number(note.expires);
}

// ============================================
// STATUS DOT COLOR
// ============================================

/**
 * Get Tailwind background color class for note status dot
 */
export function getStatusDotColor(note: Note): string {
  // Spent notes
  if (note.status === "spent") {
    return "bg-neutral-500";
  }

  // Cross-chain intent pending (waiting for solver)
  if (note.isCrossChain && note.intentStatus === "pending") {
    return "bg-amber-400";
  }

  // Cross-chain intent refunded
  if (note.isCrossChain && note.intentStatus === "refunded") {
    return "bg-orange-500";
  }

  // ASP status
  if (note.aspStatus === "approved") return "bg-emerald-500";
  if (note.aspStatus === "rejected") return "bg-rose-500";
  if (note.aspStatus === "pending") return "bg-amber-400";

  return "bg-neutral-500";
}

// ============================================
// PENDING STATE DETAILS
// ============================================

/** Cross-chain intent waiting for solver to fill (not expired yet) */
export function isWaitingForSolver(note: Note): boolean {
  if (note.status !== "unspent") return false;
  if (!note.isCrossChain) return false;
  if (note.intentStatus !== "pending") return false;

  // If no expires field, assume still waiting
  if (!note.expires) return true;

  const now = Math.floor(Date.now() / 1000);
  return now <= Number(note.expires);
}

// ============================================
// FILTER FUNCTIONS
// ============================================

/**
 * Filter note chains by category
 */
export function filterNoteChains(
  noteChains: readonly ReadonlyNoteChain[],
  filter: NoteFilter
): ReadonlyNoteChain[] {
  return noteChains.filter((noteChain) => {
    const lastNote = getLastNote(noteChain);
    const category = getNoteCategory(lastNote);

    switch (filter) {
      case "spendable":
        return category === "spendable";
      case "pending":
        return category === "pending";
      case "spent":
        return category === "spent";
      default:
        return false;
    }
  });
}

export function getNoteChainCounts(noteChains: NoteChain[]): {
  spendable: number;
  pending: number;
  spent: number;
} {
  return noteChains.reduce(
    (counts, noteChain) => {
      const lastNote = getLastNote(noteChain);
      const category = getNoteCategory(lastNote);

      if (category === "spendable") {
        counts.spendable++;
      } else if (category === "pending") {
        counts.pending++;
      } else {
        counts.spent++;
      }

      return counts;
    },
    { spendable: 0, pending: 0, spent: 0 }
  );
}

export function sortNoteChainsByTimestamp(noteChains: ReadonlyNoteChain[]): ReadonlyNoteChain[] {
  return [...noteChains].sort((a, b) => {
    const lastNoteA = getLastNote(a);
    const lastNoteB = getLastNote(b);
    return Number(lastNoteB.timestamp) - Number(lastNoteA.timestamp);
  });
}

export function getSpendableNoteChains(noteChains: ReadonlyNoteChain[]): ReadonlyNoteChain[] {
  return filterNoteChains(noteChains, "spendable");
}

export function getSpendableNotes(noteChains: NoteChain[]): Note[] {
  return getSpendableNoteChains(noteChains).map(getLastNote);
}

/**
 * Get notes that can be withdrawn privately (ASP approved only)
 * This is a subset of spendable notes - excludes ASP rejected
 */
export function getWithdrawableNotes(noteChains: NoteChain[]): Note[] {
  return getSpendableNotes(noteChains).filter(canWithdraw);
}
