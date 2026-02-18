/**
 * Note Filtering Utilities - UI Layer
 *
 * UI-specific utilities only. Core domain logic is in @shinobi-cash/core/discovery.
 */

import type { Note } from "@shinobi-cash/core/discovery";
import type { ActivityItem } from "@shinobi-cash/data";
import {
  isIntentNote,
  isMergedNote,
  isRagequitNote,
  isWithdrawalNote,
  isCrosschainWithdrawalNote,
  isSpendableNote,
} from "@shinobi-cash/core/discovery";

/** Check if note is a terminal note (no further actions possible) */
function isTerminalNote(note: Note): boolean {
  return (
    isMergedNote(note) ||
    isRagequitNote(note) ||
    isWithdrawalNote(note) ||
    isCrosschainWithdrawalNote(note)
  );
}

/**
 * Get Tailwind background color class for note status dot.
 * UI-specific - returns CSS class strings.
 */
export function getStatusDotColor(note: Note): string {
  if (isTerminalNote(note)) return "bg-neutral-500";
  if (isIntentNote(note)) return "bg-amber-400";

  if (isSpendableNote(note)) {
    if (note.status === "spent") return "bg-neutral-500";
    if (note.aspStatus === "approved") return "bg-emerald-500";
    // ASP status "pending" is the only other option for spendable notes
    return "bg-amber-400";
  }

  return "bg-neutral-500";
}

/**
 * Get Tailwind background color class for activity status dot.
 * Works with raw Activity from indexer.
 *
 * data-v2 activity types:
 * - INTENT types are pending (amber)
 * - FILL types are completed (gray for withdrawals, green for deposits)
 * - REFUND types are refunded (orange)
 */
export function getActivityStatusDotColor(activity: ActivityItem): string {
  const { type } = activity;

  // Pending cross-chain operations (intent types - awaiting solver)
  if (
    type === "CROSSCHAIN_DEPOSIT_INTENT" ||
    type === "CROSSCHAIN_WITHDRAW_INTENT" ||
    type === "CROSSCHAIN_WITHDRAW_2_INTENT"
  ) {
    return "bg-amber-400";
  }

  // Refunded operations
  if (type === "CROSSCHAIN_DEPOSIT_REFUND" || type === "CROSSCHAIN_WITHDRAWAL_REFUND") {
    return "bg-orange-400";
  }

  // Completed withdrawals and ragequits are always gray (terminal)
  if (
    type === "WITHDRAW" ||
    type === "WITHDRAW_2" ||
    type === "CROSSCHAIN_WITHDRAWAL_FILL" ||
    type === "RAGEQUIT"
  ) {
    return "bg-neutral-500";
  }

  // Deposits - use ASP status (only exists on deposit types)
  if (type === "DEPOSIT" || type === "CROSSCHAIN_DEPOSIT_FILL") {
    const aspStatus = "aspStatus" in activity ? activity.aspStatus : null;
    if (aspStatus === "approved") return "bg-emerald-500";
    if (aspStatus === "pending") return "bg-amber-400";
    // No aspStatus or unknown
    return "bg-amber-400";
  }

  return "bg-neutral-500";
}
