/**
 * Note Filtering Utilities - UI Layer
 *
 * UI-specific utilities only. Core domain logic is in @shinobi-cash/core/discovery.
 */

import type { Note, Activity } from "@shinobi-cash/core/discovery";
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
  return isMergedNote(note) || isRagequitNote(note) || isWithdrawalNote(note) || isCrosschainWithdrawalNote(note);
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
    if (note.aspStatus === "rejected") return "bg-rose-500";
    if (note.aspStatus === "pending") return "bg-amber-400";
  }

  return "bg-neutral-500";
}

/**
 * Get Tailwind background color class for activity status dot.
 * Works with raw Activity from indexer.
 */
export function getActivityStatusDotColor(activity: Activity): string {
  const { type, aspStatus, intentStatus } = activity;

  // Pending cross-chain operations (awaiting solver)
  if (type === "CROSSCHAIN_DEPOSIT_PENDING" ||
      type === "CROSSCHAIN_WITHDRAWAL_PENDING" ||
      type === "CROSSCHAIN_WITHDRAW2_PENDING") {
    if (intentStatus === "pending") return "bg-amber-400";
    if (intentStatus === "refunded") return "bg-rose-400";
    // Filled intents are complete
    return "bg-neutral-500";
  }

  // Completed withdrawals and ragequits are always gray (terminal)
  if (type === "WITHDRAWAL" ||
      type === "WITHDRAW2" ||
      type === "CROSSCHAIN_WITHDRAWAL" ||
      type === "CROSSCHAIN_WITHDRAW2" ||
      type === "RAGEQUIT") {
    return "bg-neutral-500";
  }

  // Deposits - use ASP status
  if (type === "DEPOSIT" || type === "CROSSCHAIN_DEPOSIT") {
    if (aspStatus === "approved") return "bg-emerald-500";
    if (aspStatus === "rejected") return "bg-rose-500";
    if (aspStatus === "pending") return "bg-amber-400";
  }

  return "bg-neutral-500";
}
