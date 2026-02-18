/**
 * Activity Derivation Utility
 *
 * Converts raw activities from discovery into ActivityEntry for display.
 */

import type { ActivityItem } from "@shinobi-cash/data";
import type { ActivityEntry, ActivityType } from "@/types/activity";

/**
 * Get display type from Activity type.
 */
function getDisplayType(activity: ActivityItem): ActivityType {
  switch (activity.type) {
    case "DEPOSIT":
    case "CROSSCHAIN_DEPOSIT_FILL":
    case "CROSSCHAIN_DEPOSIT_INTENT":
      return "deposit";
    case "WITHDRAW":
    case "WITHDRAW_2":
    case "CROSSCHAIN_WITHDRAW_INTENT":
    case "CROSSCHAIN_WITHDRAW_2_INTENT":
    case "CROSSCHAIN_WITHDRAWAL_FILL":
      return "withdrawal";
    case "CROSSCHAIN_DEPOSIT_REFUND":
    case "CROSSCHAIN_WITHDRAWAL_REFUND":
      return "refund";
    case "RAGEQUIT":
      return "ragequit";
    default:
      return "withdrawal";
  }
}

/**
 * Check if activity is cross-chain.
 */
function isCrossChainActivity(activity: ActivityItem): boolean {
  return (
    activity.type === "CROSSCHAIN_DEPOSIT_FILL" ||
    activity.type === "CROSSCHAIN_DEPOSIT_INTENT" ||
    activity.type === "CROSSCHAIN_DEPOSIT_REFUND" ||
    activity.type === "CROSSCHAIN_WITHDRAW_INTENT" ||
    activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT" ||
    activity.type === "CROSSCHAIN_WITHDRAWAL_FILL" ||
    activity.type === "CROSSCHAIN_WITHDRAWAL_REFUND"
  );
}

/**
 * Get display amount from Activity.
 */
function getDisplayAmount(activity: ActivityItem): string {
  return activity.amount?.toString() ?? "0";
}

/**
 * Create ActivityEntry from raw Activity.
 */
function createActivityEntry(activity: ActivityItem): ActivityEntry {
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
export function deriveActivitiesFromRawActivities(activities: ActivityItem[]): ActivityEntry[] {
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
 * Find activity entry by ID (txHash in data-v2)
 */
export function findActivityById(entries: ActivityEntry[], id: string): ActivityEntry | undefined {
  return entries.find((e) => e.activity.txHash === id);
}
