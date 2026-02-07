import type { Note, NoteChain, PendingIntentNote, RefundNote } from "@shinobi-cash/core/discovery";
import type { NoteFilter, NoteCategory, ReadonlyNoteChain } from "@/types/notes";

/**
 * Note Filtering Utilities - 3-Category Model
 *
 * Categories based on what actions the user can take:
 *
 * 1. **Spendable** - Can take action NOW
 *    - ASP approved → Private Withdraw or Ragequit
 *    - ASP rejected → Ragequit only
 *    - RefundNote (unspent) → Can be withdrawn
 *
 * 2. **Pending** - Waiting for something
 *    - Cross-chain intent not filled (waiting for solver)
 *    - Cross-chain intent expired (can claim refund)
 *    - ASP pending (waiting for approval, can ragequit)
 *    - PendingIntentNote (escrowed funds waiting for solver or refund)
 *
 * 3. **Spent** - No action possible
 *    - Already withdrawn (status = 'spent')
 *    - PendingIntentNote with filled/refunded status
 *
 * Key fields:
 * - status: 'unspent' | 'spent' | 'merged' - spending status
 * - aspStatus: 'pending' | 'approved' | 'rejected' - compliance status
 * - intentStatus: 'pending' | 'filled' | 'refunded' - cross-chain intent
 * - expires: unix timestamp when refund becomes available (cross-chain only)
 */

// ============================================
// TYPE GUARDS
// ============================================

/** Check if note is a PendingIntentNote (escrowed funds in InputSettler) */
export function isPendingIntentNote(note: Note): note is PendingIntentNote {
  return note.noteType === "pendingIntent";
}

/** Check if note is a RefundNote (claimable refund from failed cross-chain) */
export function isRefundNote(note: Note): note is RefundNote {
  return note.noteType === "refund";
}

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
 * - PendingIntentNote: never in pool (escrowed in InputSettler)
 * - RefundNote: always in pool (refund commitment inserted)
 */
export function isInPool(note: Note): boolean {
  // PendingIntentNote is never in pool - funds are in InputSettler
  if (isPendingIntentNote(note)) return false;

  // RefundNote is always in pool - refund commitment was inserted
  if (isRefundNote(note)) return true;

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
  // Spent: Already used, merged
  if (note.status === "spent") return "spent";
  if (note.status === "merged") return "spent";

  // Zero balance is effectively spent (except PendingIntentNote which may be refundable)
  if (!isPendingIntentNote(note) && BigInt(note.amount) <= BigInt(0)) return "spent";

  // PendingIntentNote: Always in pending category until resolved
  // - Awaiting solver fill OR
  // - Awaiting user to claim refund (expired intent)
  if (isPendingIntentNote(note)) {
    // If intentStatus is already 'filled' or 'refunded', the status should be 'spent'
    // (handled above), but double-check here
    if (note.intentStatus === "filled" || note.intentStatus === "refunded") {
      return "spent";
    }
    return "pending";
  }

  // RefundNote: Spendable if unspent (it's in the pool and can be withdrawn)
  if (isRefundNote(note)) {
    return note.status === "unspent" ? "spendable" : "spent";
  }

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
  // PendingIntentNote cannot be withdrawn - funds are escrowed
  if (isPendingIntentNote(note)) return false;

  // RefundNote can be withdrawn if unspent and ASP approved
  if (isRefundNote(note)) {
    return note.status === "unspent" && note.aspStatus === "approved" && BigInt(note.amount) > BigInt(0);
  }

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
  // PendingIntentNote cannot ragequit - funds are escrowed in InputSettler
  if (isPendingIntentNote(note)) return false;

  // RefundNote can ragequit (it's in the pool)
  if (isRefundNote(note)) {
    return note.status === "unspent" && BigInt(note.amount) > BigInt(0);
  }

  return note.status === "unspent" && isInPool(note) && BigInt(note.amount) > BigInt(0);
}

/**
 * Can claim refund for expired cross-chain intent
 * Available for PendingIntentNote when intent is pending and current time > expires
 */
export function canClaimRefund(note: Note): boolean {
  // Only PendingIntentNote can claim refund
  if (!isPendingIntentNote(note)) return false;

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
  // Spent or merged notes
  if (note.status === "spent" || note.status === "merged") {
    return "bg-neutral-500";
  }

  // PendingIntentNote: show different colors based on state
  if (isPendingIntentNote(note)) {
    if (canClaimRefund(note)) {
      return "bg-orange-500"; // Refund available
    }
    return "bg-amber-400"; // Waiting for solver
  }

  // RefundNote: show as spendable (approved) or based on ASP status
  if (isRefundNote(note)) {
    if (note.aspStatus === "approved") return "bg-emerald-500";
    if (note.aspStatus === "rejected") return "bg-rose-500";
    return "bg-amber-400"; // Pending ASP
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
  // PendingIntentNote is always cross-chain and waiting for solver
  if (isPendingIntentNote(note)) {
    if (note.status !== "unspent") return false;
    if (note.intentStatus !== "pending") return false;

    // If no expires field, assume still waiting
    if (!note.expires) return true;

    const now = Math.floor(Date.now() / 1000);
    return now <= Number(note.expires);
  }

  // Other cross-chain notes (ChangeNote with pending intent)
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

// ============================================
// PENDING INTENT DISPLAY HELPERS
// ============================================

export type PendingIntentState =
  | { state: "awaiting_solver"; timeRemaining: number | null }
  | { state: "awaiting_fill"; message: string }
  | { state: "refund_available"; timeExpiredAgo: number }
  | { state: "filled"; message: string }
  | { state: "refunded"; message: string };

/**
 * Get display state for a PendingIntentNote
 * This provides user-friendly information about what's happening with escrowed funds
 */
export function getPendingIntentDisplayState(note: Note): PendingIntentState | null {
  if (!isPendingIntentNote(note)) return null;

  const now = Math.floor(Date.now() / 1000);

  // Intent was filled by solver
  if (note.intentStatus === "filled") {
    return { state: "filled", message: "Funds delivered to recipient" };
  }

  // Intent was refunded
  if (note.intentStatus === "refunded") {
    return { state: "refunded", message: "Refund claimed - funds returned to pool" };
  }

  // Intent is still pending
  if (note.intentStatus === "pending") {
    // Check if we're past the fill deadline but not yet expired
    if (note.fillDeadline) {
      const fillDeadline = Number(note.fillDeadline);
      if (now > fillDeadline && note.expires && now <= Number(note.expires)) {
        return { state: "awaiting_fill", message: "Solver window passed, awaiting timeout" };
      }
    }

    // Check if intent has expired (refund available)
    if (note.expires) {
      const expires = Number(note.expires);
      if (now > expires) {
        return { state: "refund_available", timeExpiredAgo: now - expires };
      }

      // Still waiting for solver
      return { state: "awaiting_solver", timeRemaining: expires - now };
    }

    // No expiry set, assume still waiting
    return { state: "awaiting_solver", timeRemaining: null };
  }

  return null;
}

/**
 * Get a user-friendly status text for a PendingIntentNote
 */
export function getPendingIntentStatusText(note: Note): string {
  const displayState = getPendingIntentDisplayState(note);
  if (!displayState) return "";

  switch (displayState.state) {
    case "awaiting_solver":
      if (displayState.timeRemaining !== null) {
        return `Awaiting delivery (${formatTimeRemaining(displayState.timeRemaining)})`;
      }
      return "Awaiting cross-chain delivery";

    case "awaiting_fill":
      return displayState.message;

    case "refund_available":
      return "Refund available - claim now";

    case "filled":
      return displayState.message;

    case "refunded":
      return displayState.message;

    default:
      return "";
  }
}

/**
 * Format seconds into a human-readable time remaining string
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "expired";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
