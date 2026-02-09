/**
 * Activity Types
 *
 * ActivityEntry wraps a Note with computed display values.
 * This provides a view model for the activity list/details screens.
 */

import type { Note } from "@shinobi-cash/core/discovery";

/**
 * Display type derived from note type
 */
export type ActivityType = "deposit" | "withdrawal" | "refund";

/**
 * Activity filter options
 */
export type ActivityFilter = "all" | "deposit" | "withdrawal" | "refund";

/**
 * Activity entry - wraps a Note with computed display values
 */
export interface ActivityEntry {
  /** The underlying note */
  note: Note;

  /** Display type (deposit/withdrawal/refund) */
  type: ActivityType;

  /**
   * Display amount:
   * - For deposits: the deposited amount (note.amount)
   * - For withdrawals: the withdrawn amount (prevNote.amount - note.amount)
   * - For refunds: the refunded amount
   */
  displayAmount: string;

  /** Whether this is a cross-chain operation */
  isCrossChain: boolean;
}

/**
 * Activity status for UI
 */
export type ActivityStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "empty" }
  | { type: "ready" };

/**
 * Activity filter labels for UI
 */
export const ACTIVITY_FILTER_LABELS: Record<ActivityFilter, string> = {
  all: "All",
  deposit: "Deposits",
  withdrawal: "Withdrawals",
  refund: "Refunds",
};

/**
 * Activity type labels for UI
 */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  refund: "Refund",
};

/**
 * Get unique ID for an activity entry
 * Includes noteType to differentiate between notes with same depositIndex/changeIndex
 */
export function getActivityId(entry: ActivityEntry): string {
  const { note } = entry;
  const baseId = `${note.noteType}-${note.depositIndex}-${note.changeIndex}`;
  // RefundNotes have additional refundIndex
  if (note.noteType === "refund") {
    return `${baseId}-${note.refundIndex}`;
  }
  return baseId;
}

/**
 * Get activity type from note
 */
export function getActivityType(note: Note): ActivityType {
  if (note.noteType === "deposit") return "deposit";
  if (note.noteType === "depositIntent") return "deposit";
  if (note.noteType === "refund") return "refund";
  if (note.noteType === "withdrawalIntent") return "withdrawal";
  return "withdrawal";
}
