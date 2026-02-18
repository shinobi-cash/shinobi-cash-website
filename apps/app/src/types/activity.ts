/**
 * Activity Types
 *
 * ActivityEntry wraps a raw Activity with computed display values.
 * This provides a view model for the activity list/details screens.
 */

import type { ActivityItem } from "@shinobi-cash/data";

/**
 * Activity filter options
 */
export type ActivityFilter = "all" | "deposit" | "withdrawal" | "refund";

/**
 * Display activity type (simplified for UI)
 */
export type ActivityType = "deposit" | "withdrawal" | "refund" | "ragequit";

/**
 * Activity entry - wraps raw Activity with display values
 */
export interface ActivityEntry {
  /** The raw activity from indexer */
  activity: ActivityItem;

  /** Display type (deposit/withdrawal/refund/ragequit) */
  type: ActivityType;

  /** Display amount as string */
  displayAmount: string;

  /** Whether this is a cross-chain operation */
  isCrossChain: boolean;

  /** Display timestamp (Unix seconds as string) */
  displayTimestamp: string;
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
  ragequit: "Ragequit",
};

/**
 * Get unique ID for an activity entry.
 * Uses the activity's txHash from indexer.
 */
export function getActivityId(entry: ActivityEntry): string {
  return entry.activity.txHash;
}
