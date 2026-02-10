/**
 * Activity Derivation Utility
 *
 * Converts raw activities from discovery into ActivityEntry for display.
 */

import type { Activity, ActivityType } from "@shinobi-cash/core/discovery";
import type { ActivityEntry } from "@/types/activity";

/**
 * Get display type from Activity type.
 */
function getDisplayType(activity: Activity): ActivityType {
  switch (activity.type) {
    case "DEPOSIT":
    case "CROSSCHAIN_DEPOSIT":
    case "CROSSCHAIN_DEPOSIT_PENDING":
      return "deposit";
    case "WITHDRAWAL":
    case "WITHDRAW2":
    case "CROSSCHAIN_WITHDRAWAL":
    case "CROSSCHAIN_WITHDRAW2":
    case "CROSSCHAIN_WITHDRAWAL_PENDING":
    case "CROSSCHAIN_WITHDRAW2_PENDING":
      return "withdrawal";
    case "RAGEQUIT":
      return "ragequit";
    default:
      return "withdrawal";
  }
}

/**
 * Check if activity is cross-chain.
 */
function isCrossChainActivity(activity: Activity): boolean {
  return (
    activity.type === "CROSSCHAIN_DEPOSIT" ||
    activity.type === "CROSSCHAIN_DEPOSIT_PENDING" ||
    activity.type === "CROSSCHAIN_WITHDRAWAL" ||
    activity.type === "CROSSCHAIN_WITHDRAW2" ||
    activity.type === "CROSSCHAIN_WITHDRAWAL_PENDING" ||
    activity.type === "CROSSCHAIN_WITHDRAW2_PENDING"
  );
}

/**
 * Get display amount from Activity.
 */
function getDisplayAmount(activity: Activity): string {
  return activity.amount?.toString() ?? "0";
}

/**
 * Create ActivityEntry from raw Activity.
 */
function createActivityEntry(activity: Activity): ActivityEntry {
  return {
    activity,
    type: getDisplayType(activity),
    displayAmount: getDisplayAmount(activity),
    isCrossChain: isCrossChainActivity(activity),
    displayTimestamp: activity.timestamp.toString(),
  };
}

/**
 * Derive activity entries from raw activities.
 * Activities are already sorted by timestamp descending from discovery.
 */
export function deriveActivitiesFromRawActivities(
  activities: Activity[]
): ActivityEntry[] {
  return activities.map(createActivityEntry);
}

/**
 * Filter activity entries by type
 */
export function filterActivitiesByType(
  entries: ActivityEntry[],
  filter: "all" | ActivityType
): ActivityEntry[] {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.type === filter);
}

/**
 * Get activity counts by type
 */
export function getActivityCounts(entries: ActivityEntry[]) {
  return {
    total: entries.length,
    deposit: entries.filter((e) => e.type === "deposit").length,
    withdrawal: entries.filter((e) => e.type === "withdrawal").length,
    refund: entries.filter((e) => e.type === "refund").length,
    ragequit: entries.filter((e) => e.type === "ragequit").length,
  };
}

/**
 * Find activity entry by ID
 */
export function findActivityById(entries: ActivityEntry[], id: string): ActivityEntry | undefined {
  return entries.find((e) => e.activity.id === id);
}
