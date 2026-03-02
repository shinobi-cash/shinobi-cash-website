import type { ActivityItem } from "../types/index.js";

export type ActivityCategory = "deposit" | "withdrawal" | "refund" | "ragequit";

export interface ActivityTimelineEvent {
  activity: ActivityItem;
  label: string;
  timestamp: string;
}

export interface ConsolidatedActivity {
  activity: ActivityItem;
  type: ActivityCategory;
  displayAmount: string;
  isCrossChain: boolean;
  displayTimestamp: string;
  timeline?: ActivityTimelineEvent[];
}

/**
 * Map activity type to a display category.
 */
export function getActivityCategory(activity: ActivityItem): ActivityCategory {
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
export function isCrossChainActivity(activity: ActivityItem): boolean {
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
 * Priority for selecting final state (higher = takes precedence).
 */
export function getActivityPriority(activity: ActivityItem): number {
  switch (activity.type) {
    case "CROSSCHAIN_DEPOSIT_INTENT":
    case "CROSSCHAIN_WITHDRAW_INTENT":
    case "CROSSCHAIN_WITHDRAW_2_INTENT":
      return 1;
    case "CROSSCHAIN_DEPOSIT_FILL":
    case "CROSSCHAIN_WITHDRAWAL_FILL":
      return 2;
    case "CROSSCHAIN_DEPOSIT_REFUND":
    case "CROSSCHAIN_WITHDRAWAL_REFUND":
      return 3;
    default:
      return 0;
  }
}

function getOrderId(activity: ActivityItem): string | null {
  if ("orderId" in activity) {
    return activity.orderId;
  }
  return null;
}

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
 * Consolidate raw activities from the indexer.
 * Cross-chain activities are grouped by orderId — only the final state is shown,
 * with a timeline of all related events.
 */
export function consolidateActivities(
  activities: ActivityItem[]
): ConsolidatedActivity[] {
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

  const entries: ConsolidatedActivity[] = [];

  for (const [, group] of orderGroups) {
    const sorted = [...group].sort(
      (a, b) => getActivityPriority(b) - getActivityPriority(a)
    );
    const finalActivity = sorted[0]!;

    const timeline: ActivityTimelineEvent[] = [...group]
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
      .map((act) => ({
        activity: act,
        label: getTimelineLabel(act),
        timestamp: act.timestamp.toString(),
      }));

    entries.push({
      activity: finalActivity,
      type: getActivityCategory(finalActivity),
      displayAmount: finalActivity.amount?.toString() ?? "0",
      isCrossChain: true,
      displayTimestamp: finalActivity.timestamp.toString(),
      timeline,
    });
  }

  for (const activity of standaloneActivities) {
    entries.push({
      activity,
      type: getActivityCategory(activity),
      displayAmount: activity.amount?.toString() ?? "0",
      isCrossChain: isCrossChainActivity(activity),
      displayTimestamp: activity.timestamp.toString(),
    });
  }

  entries.sort(
    (a, b) => Number(b.displayTimestamp) - Number(a.displayTimestamp)
  );

  return entries;
}

/**
 * Filter consolidated activities by category.
 */
export function filterByCategory(
  entries: ConsolidatedActivity[],
  filter: "all" | ActivityCategory
): ConsolidatedActivity[] {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.type === filter);
}

/**
 * Get activity counts by category.
 */
export function getActivityCounts(entries: ConsolidatedActivity[]) {
  return {
    total: entries.length,
    deposit: entries.filter((e) => e.type === "deposit").length,
    withdrawal: entries.filter((e) => e.type === "withdrawal").length,
    refund: entries.filter((e) => e.type === "refund").length,
    ragequit: entries.filter((e) => e.type === "ragequit").length,
  };
}
