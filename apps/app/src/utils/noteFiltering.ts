/**
 * Note Filtering Utilities - UI Layer
 *
 * UI-specific utilities only. Core domain logic is in @shinobi-cash/core/discovery.
 */

import type { NoteOrIntent } from "@shinobi-cash/core/discovery";
import type { ActivityItem } from "@shinobi-cash/data";
import { isIntent, isNote, isTerminalNote, isSpendableNote } from "@shinobi-cash/core/discovery";

/**
 * Get Tailwind background color class for note status dot.
 * UI-specific - returns CSS class strings.
 */
export function getStatusDotColor(item: NoteOrIntent): string {
  if (isNote(item) && isTerminalNote(item)) return "bg-neutral-500";
  if (isIntent(item)) return "bg-amber-400";

  if (isNote(item) && isSpendableNote(item)) {
    if (item.status === "spent") return "bg-neutral-500";
    if (item.aspStatus === "approved") return "bg-emerald-500";
    // ASP status "pending" is the only other option for spendable notes
    return "bg-amber-400";
  }

  return "bg-neutral-500";
}

/**
 * Get Tailwind background color class for activity status dot.
 * Works with raw Activity from indexer.
 *
 * Simple logic:
 * - Green: Completed activities (no pending dependency)
 * - Yellow: Pending activities (awaiting solver or ASP approval)
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

  // Deposits - check ASP status
  if (type === "DEPOSIT" || type === "CROSSCHAIN_DEPOSIT_FILL") {
    const aspStatus = "aspStatus" in activity ? activity.aspStatus : null;
    if (aspStatus === "approved") return "bg-emerald-500";
    // ASP pending or unknown
    return "bg-amber-400";
  }

  // All other completed activities are green
  // (withdrawals, fills, refunds, ragequit)
  return "bg-emerald-500";
}
