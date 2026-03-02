import { describe, it, expect } from "vitest";
import type { ActivityItem } from "../src/types";
import {
  consolidateActivities,
  filterByCategory,
  getActivityCounts,
  getActivityCategory,
  isCrossChainActivity,
  getActivityPriority,
} from "../src/utils/activity-consolidation";

const BASE = {
  pool: "0xpool",
  user: "0xuser",
  txHash: "0xtx1",
  blockNumber: 100,
  timestamp: 1700000000,
  amount: "1000000000000000000",
  nullifierHash: "123",
};

function makeActivity(
  overrides: Partial<ActivityItem> & { type: ActivityItem["type"] }
): ActivityItem {
  return { ...BASE, ...overrides } as ActivityItem;
}

describe("getActivityCategory", () => {
  it("maps DEPOSIT to deposit", () => {
    expect(getActivityCategory(makeActivity({ type: "DEPOSIT" }))).toBe("deposit");
  });

  it("maps CROSSCHAIN_DEPOSIT_FILL to deposit", () => {
    expect(getActivityCategory(makeActivity({ type: "CROSSCHAIN_DEPOSIT_FILL" }))).toBe("deposit");
  });

  it("maps WITHDRAW to withdrawal", () => {
    expect(getActivityCategory(makeActivity({ type: "WITHDRAW" }))).toBe("withdrawal");
  });

  it("maps WITHDRAW_2 to withdrawal", () => {
    expect(getActivityCategory(makeActivity({ type: "WITHDRAW_2" }))).toBe("withdrawal");
  });

  it("maps CROSSCHAIN_DEPOSIT_REFUND to refund", () => {
    expect(getActivityCategory(makeActivity({ type: "CROSSCHAIN_DEPOSIT_REFUND" }))).toBe("refund");
  });

  it("maps RAGEQUIT to ragequit", () => {
    expect(getActivityCategory(makeActivity({ type: "RAGEQUIT" }))).toBe("ragequit");
  });
});

describe("isCrossChainActivity", () => {
  it("returns false for same-chain deposit", () => {
    expect(isCrossChainActivity(makeActivity({ type: "DEPOSIT" }))).toBe(false);
  });

  it("returns true for crosschain deposit fill", () => {
    expect(isCrossChainActivity(makeActivity({ type: "CROSSCHAIN_DEPOSIT_FILL" }))).toBe(true);
  });

  it("returns true for crosschain withdrawal refund", () => {
    expect(isCrossChainActivity(makeActivity({ type: "CROSSCHAIN_WITHDRAWAL_REFUND" }))).toBe(true);
  });
});

describe("getActivityPriority", () => {
  it("intents have lowest priority (1)", () => {
    expect(getActivityPriority(makeActivity({ type: "CROSSCHAIN_DEPOSIT_INTENT" }))).toBe(1);
    expect(getActivityPriority(makeActivity({ type: "CROSSCHAIN_WITHDRAW_INTENT" }))).toBe(1);
  });

  it("fills have medium priority (2)", () => {
    expect(getActivityPriority(makeActivity({ type: "CROSSCHAIN_DEPOSIT_FILL" }))).toBe(2);
  });

  it("refunds have highest priority (3)", () => {
    expect(getActivityPriority(makeActivity({ type: "CROSSCHAIN_DEPOSIT_REFUND" }))).toBe(3);
  });

  it("same-chain has priority 0", () => {
    expect(getActivityPriority(makeActivity({ type: "DEPOSIT" }))).toBe(0);
  });
});

describe("consolidateActivities", () => {
  it("returns standalone activities as-is", () => {
    const activities = [
      makeActivity({ type: "DEPOSIT", txHash: "0x1", timestamp: 1000 }),
      makeActivity({ type: "WITHDRAW", txHash: "0x2", timestamp: 2000 }),
    ];

    const result = consolidateActivities(activities);
    expect(result).toHaveLength(2);
    expect(result[0]!.type).toBe("withdrawal"); // newest first
    expect(result[1]!.type).toBe("deposit");
  });

  it("consolidates cross-chain activities by orderId", () => {
    const activities = [
      makeActivity({
        type: "CROSSCHAIN_DEPOSIT_INTENT",
        txHash: "0x1",
        timestamp: 1000,
        orderId: "order1",
      } as any),
      makeActivity({
        type: "CROSSCHAIN_DEPOSIT_FILL",
        txHash: "0x2",
        timestamp: 2000,
        orderId: "order1",
      } as any),
    ];

    const result = consolidateActivities(activities);
    expect(result).toHaveLength(1); // consolidated into one
    expect(result[0]!.activity.type).toBe("CROSSCHAIN_DEPOSIT_FILL"); // higher priority
    expect(result[0]!.timeline).toHaveLength(2);
    expect(result[0]!.timeline![0]!.label).toBe("Intent created");
    expect(result[0]!.timeline![1]!.label).toBe("Deposit filled");
  });

  it("selects refund over fill when both exist", () => {
    const activities = [
      makeActivity({
        type: "CROSSCHAIN_DEPOSIT_INTENT",
        txHash: "0x1",
        timestamp: 1000,
        orderId: "order1",
      } as any),
      makeActivity({
        type: "CROSSCHAIN_DEPOSIT_FILL",
        txHash: "0x2",
        timestamp: 2000,
        orderId: "order1",
      } as any),
      makeActivity({
        type: "CROSSCHAIN_DEPOSIT_REFUND",
        txHash: "0x3",
        timestamp: 3000,
        orderId: "order1",
      } as any),
    ];

    const result = consolidateActivities(activities);
    expect(result).toHaveLength(1);
    expect(result[0]!.activity.type).toBe("CROSSCHAIN_DEPOSIT_REFUND"); // highest priority
  });

  it("sorts by timestamp descending", () => {
    const activities = [
      makeActivity({ type: "DEPOSIT", txHash: "0x1", timestamp: 1000 }),
      makeActivity({ type: "DEPOSIT", txHash: "0x2", timestamp: 3000 }),
      makeActivity({ type: "DEPOSIT", txHash: "0x3", timestamp: 2000 }),
    ];

    const result = consolidateActivities(activities);
    expect(result[0]!.displayTimestamp).toBe("3000");
    expect(result[1]!.displayTimestamp).toBe("2000");
    expect(result[2]!.displayTimestamp).toBe("1000");
  });
});

describe("filterByCategory", () => {
  const entries = consolidateActivities([
    makeActivity({ type: "DEPOSIT", txHash: "0x1", timestamp: 1000 }),
    makeActivity({ type: "WITHDRAW", txHash: "0x2", timestamp: 2000 }),
  ]);

  it("returns all for 'all' filter", () => {
    expect(filterByCategory(entries, "all")).toHaveLength(2);
  });

  it("filters by deposit", () => {
    expect(filterByCategory(entries, "deposit")).toHaveLength(1);
    expect(filterByCategory(entries, "deposit")[0]!.type).toBe("deposit");
  });

  it("filters by withdrawal", () => {
    expect(filterByCategory(entries, "withdrawal")).toHaveLength(1);
  });
});

describe("getActivityCounts", () => {
  it("counts by category", () => {
    const entries = consolidateActivities([
      makeActivity({ type: "DEPOSIT", txHash: "0x1", timestamp: 1000 }),
      makeActivity({ type: "DEPOSIT", txHash: "0x2", timestamp: 2000 }),
      makeActivity({ type: "WITHDRAW", txHash: "0x3", timestamp: 3000 }),
    ]);

    const counts = getActivityCounts(entries);
    expect(counts.total).toBe(3);
    expect(counts.deposit).toBe(2);
    expect(counts.withdrawal).toBe(1);
    expect(counts.refund).toBe(0);
  });
});
