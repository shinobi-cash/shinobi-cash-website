/**
 * Activity Derivation Utility
 *
 * Converts raw activities from discovery into ActivityEntry for display.
 * Cross-chain activities are consolidated by orderId - only the final
 * state is shown in the list, with full timeline available in details.
 */

import type { ActivityItem } from "@shinobi-cash/data";
import type { ActivityEntry, ActivityType, ActivityTimelineEvent } from "@/types/activity";

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
 * Get orderId from activity if it has one (cross-chain activities).
 */
function getOrderId(activity: ActivityItem): string | null {
  if ("orderId" in activity) {
    return activity.orderId;
  }
  return null;
}

/**
 * Get display amount from Activity.
 */
function getDisplayAmount(activity: ActivityItem): string {
  return activity.amount?.toString() ?? "0";
}

/**
 * Get timeline label for activity type.
 */
function getTimelineLabel(activity: ActivityItem): string {
  switch (activity.type) {
    case "CROSSCHAIN_DEPOSIT_INTENT":
      return "Intent created";
    case "CROSSCHAIN_DEPOSIT_FILL":
      return "Deposit filled";
    case "CROSSCHAIN_DEPOSIT_REFUND":
      return "Deposit refunded";
    case "CROSSCHAIN_WITHDRAW_INTENT":
    case "CROSSCHAIN_WITHDRAW_2_INTENT":
      return "Intent created";
    case "CROSSCHAIN_WITHDRAWAL_FILL":
      return "Withdrawal filled";
    case "CROSSCHAIN_WITHDRAWAL_REFUND":
      return "Withdrawal refunded";
    default:
      return activity.type;
  }
}

/**
 * Priority for selecting final state (higher = takes precedence).
 */
function getActivityPriority(activity: ActivityItem): number {
  switch (activity.type) {
    // Intents are lowest priority (pending state)
    case "CROSSCHAIN_DEPOSIT_INTENT":
    case "CROSSCHAIN_WITHDRAW_INTENT":
    case "CROSSCHAIN_WITHDRAW_2_INTENT":
      return 1;
    // Fills are higher priority (completed state)
    case "CROSSCHAIN_DEPOSIT_FILL":
    case "CROSSCHAIN_WITHDRAWAL_FILL":
      return 2;
    // Refunds are highest priority (final state after failure)
    case "CROSSCHAIN_DEPOSIT_REFUND":
    case "CROSSCHAIN_WITHDRAWAL_REFUND":
      return 3;
    default:
      return 0;
  }
}

/**
 * Create ActivityEntry from raw Activity with optional timeline.
 */
function createActivityEntry(
  activity: ActivityItem,
  timeline?: ActivityTimelineEvent[]
): ActivityEntry {
  return {
    activity,
    type: getDisplayType(activity),
    displayAmount: getDisplayAmount(activity),
    isCrossChain: isCrossChainActivity(activity),
    displayTimestamp: activity.timestamp.toString(),
    timeline,
  };
}

/**
 * Derive activity entries from raw activities.
 * Cross-chain activities are consolidated by orderId - only the final state is shown.
 */
export function deriveActivitiesFromRawActivities(activities: ActivityItem[]): ActivityEntry[] {
  // Group cross-chain activities by orderId
  const orderGroups = new Map<string, ActivityItem[]>();
  const standaloneActivities: ActivityItem[] = [];

  for (const activity of activities) {
    const orderId = getOrderId(activity);
    if (orderId && isCrossChainActivity(activity)) {
      const group = orderGroups.get(orderId) ?? [];
      group.push(activity);
      orderGroups.set(orderId, group);
    } else {
      standaloneActivities.push(activity);
    }
  }

  const entries: ActivityEntry[] = [];

  // Process grouped cross-chain activities
  for (const [, group] of orderGroups) {
    // Sort by priority to get final state
    const sorted = [...group].sort((a, b) => getActivityPriority(b) - getActivityPriority(a));
    const finalActivity = sorted[0];

    // Build timeline (sorted by timestamp ascending)
    const timeline: ActivityTimelineEvent[] = [...group]
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
      .map((act) => ({
        activity: act,
        label: getTimelineLabel(act),
        timestamp: act.timestamp.toString(),
      }));

    entries.push(createActivityEntry(finalActivity, timeline));
  }

  // Add standalone activities
  for (const activity of standaloneActivities) {
    entries.push(createActivityEntry(activity));
  }

  // Sort all entries by timestamp descending (newest first)
  entries.sort((a, b) => Number(b.displayTimestamp) - Number(a.displayTimestamp));

  return entries;
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
