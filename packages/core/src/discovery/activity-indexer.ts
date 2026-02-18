/**
 * @shinobi-cash/core/discovery
 * Activity indexing for fast lookups during discovery
 */

import type {
  ActivityItem,
  WithdrawActivity,
  Withdraw2Activity,
  CrosschainWithdrawIntentActivity,
  CrosschainWithdraw2IntentActivity,
} from "@shinobi-cash/data";

// ============================================================================
// Activity Index Type
// ============================================================================

export interface ActivityIndex {
  /** Same-chain 1:1 withdrawals indexed by spentNullifier */
  sameChainWithdrawalsByNullifier: Map<string, WithdrawActivity>;
  /** Cross-chain 1:1 withdrawal intents indexed by spentNullifier */
  crosschainWithdrawIntentsByNullifier: Map<string, CrosschainWithdrawIntentActivity>;
  /** Same-chain 2:1 Withdraw2 indexed by BOTH nullifiers */
  sameChainWithdraw2ByNullifier: Map<string, Withdraw2Activity>;
  /** Cross-chain 2:1 withdrawal intents indexed by BOTH nullifiers */
  crosschainWithdraw2IntentsByNullifier: Map<string, CrosschainWithdraw2IntentActivity>;
  /** Deposits indexed by precommitment */
  depositsByPrecommitment: Map<string, ActivityItem>;
  /** Ragequit indexed by commitment hash */
  ragequitByCommitment: Map<string, ActivityItem>;
  /** Cross-chain withdrawal fills indexed by orderId (for reconciler) */
  withdrawalFillsByOrderId: Map<string, ActivityItem>;
  /** Cross-chain withdrawal refunds indexed by orderId (for reconciler) */
  withdrawalRefundsByOrderId: Map<string, ActivityItem>;
  /** Cross-chain deposit fills indexed by orderId (for reconciler) */
  depositFillsByOrderId: Map<string, ActivityItem>;
  /** Cross-chain deposit refunds indexed by orderId (for reconciler) */
  depositRefundsByOrderId: Map<string, ActivityItem>;
}

// ============================================================================
// Type Guards
// ============================================================================

/** Check if activity is a deposit (same-chain or cross-chain fill) */
export function isDepositActivity(activity: ActivityItem): boolean {
  return activity.type === "DEPOSIT" || activity.type === "CROSSCHAIN_DEPOSIT_FILL";
}

/** Check if activity is a cross-chain deposit intent */
export function isCrosschainDepositIntent(activity: ActivityItem): boolean {
  return activity.type === "CROSSCHAIN_DEPOSIT_INTENT";
}

/** Check if activity is a same-chain 1:1 withdrawal */
export function isSameChainWithdrawal(activity: ActivityItem): activity is WithdrawActivity {
  return activity.type === "WITHDRAW";
}

/** Check if activity is a cross-chain 1:1 withdrawal intent */
export function isCrosschainWithdrawIntent(
  activity: ActivityItem
): activity is CrosschainWithdrawIntentActivity {
  return activity.type === "CROSSCHAIN_WITHDRAW_INTENT";
}

/** Check if activity is a same-chain 2:1 withdrawal */
export function isSameChainWithdraw2(activity: ActivityItem): activity is Withdraw2Activity {
  return activity.type === "WITHDRAW_2";
}

/** Check if activity is a cross-chain 2:1 withdrawal intent */
export function isCrosschainWithdraw2Intent(
  activity: ActivityItem
): activity is CrosschainWithdraw2IntentActivity {
  return activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT";
}

/** Check if activity is any 1:1 withdrawal (same-chain or cross-chain intent) */
export function is1x1WithdrawalActivity(activity: ActivityItem): boolean {
  return activity.type === "WITHDRAW" || activity.type === "CROSSCHAIN_WITHDRAW_INTENT";
}

/** Check if activity is any 2:1 withdrawal (same-chain or cross-chain intent) */
export function isWithdraw2Activity(activity: ActivityItem): boolean {
  return activity.type === "WITHDRAW_2" || activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT";
}

/** Check if activity is a cross-chain withdrawal fill */
export function isCrosschainWithdrawalFill(activity: ActivityItem): boolean {
  return activity.type === "CROSSCHAIN_WITHDRAWAL_FILL";
}

/** Check if activity is a cross-chain withdrawal refund */
export function isCrosschainWithdrawalRefund(activity: ActivityItem): boolean {
  return activity.type === "CROSSCHAIN_WITHDRAWAL_REFUND";
}

/** Check if activity is a cross-chain deposit refund */
export function isCrosschainDepositRefund(activity: ActivityItem): boolean {
  return activity.type === "CROSSCHAIN_DEPOSIT_REFUND";
}

/** Check if activity is a ragequit */
export function isRagequitActivity(activity: ActivityItem): boolean {
  return activity.type === "RAGEQUIT";
}

/** Check if activity has spentNullifiers (withdrawal activities on pool chain) */
function hasSpentNullifiers(
  activity: ActivityItem
): activity is ActivityItem & { spentNullifiers: string[] } {
  return "spentNullifiers" in activity && Array.isArray(activity.spentNullifiers);
}

// ============================================================================
// Index Builder
// ============================================================================

/**
 * Build lookup maps from a list of activities
 * Enables O(1) lookups during chain extension
 */
export function buildActivityIndex(activities: ActivityItem[]): ActivityIndex {
  const index: ActivityIndex = {
    sameChainWithdrawalsByNullifier: new Map(),
    crosschainWithdrawIntentsByNullifier: new Map(),
    sameChainWithdraw2ByNullifier: new Map(),
    crosschainWithdraw2IntentsByNullifier: new Map(),
    depositsByPrecommitment: new Map(),
    ragequitByCommitment: new Map(),
    withdrawalFillsByOrderId: new Map(),
    withdrawalRefundsByOrderId: new Map(),
    depositFillsByOrderId: new Map(),
    depositRefundsByOrderId: new Map(),
  };

  for (const activity of activities) {
    // Index deposits by precommitment (includes same-chain deposits, cross-chain fills, and cross-chain intents)
    if (isDepositActivity(activity) && "precommitment" in activity && activity.precommitment) {
      index.depositsByPrecommitment.set(activity.precommitment, activity);
    }
    // Also index deposit intents (pending cross-chain deposits)
    if (
      isCrosschainDepositIntent(activity) &&
      "precommitment" in activity &&
      activity.precommitment
    ) {
      index.depositsByPrecommitment.set(activity.precommitment, activity);
    }

    // Index cross-chain deposit fills by orderId (for reconciler)
    if (activity.type === "CROSSCHAIN_DEPOSIT_FILL" && "orderId" in activity && activity.orderId) {
      index.depositFillsByOrderId.set(activity.orderId, activity);
    }

    // Index cross-chain deposit refunds by orderId (for reconciler)
    if (isCrosschainDepositRefund(activity) && "orderId" in activity && activity.orderId) {
      index.depositRefundsByOrderId.set(activity.orderId, activity);
    }

    // Index same-chain 1:1 withdrawals by nullifier
    if (isSameChainWithdrawal(activity) && hasSpentNullifiers(activity)) {
      const nullifier = activity.spentNullifiers[0];
      if (nullifier) {
        index.sameChainWithdrawalsByNullifier.set(nullifier, activity);
      }
    }

    // Index cross-chain 1:1 withdrawal intents by nullifier
    if (isCrosschainWithdrawIntent(activity) && hasSpentNullifiers(activity)) {
      const nullifier = activity.spentNullifiers[0];
      if (nullifier) {
        index.crosschainWithdrawIntentsByNullifier.set(nullifier, activity);
      }
    }

    // Index same-chain 2:1 withdrawals by BOTH nullifiers
    if (isSameChainWithdraw2(activity) && hasSpentNullifiers(activity)) {
      const nullifiers = activity.spentNullifiers;
      if (nullifiers[0]) {
        index.sameChainWithdraw2ByNullifier.set(nullifiers[0], activity);
      }
      if (nullifiers[1]) {
        index.sameChainWithdraw2ByNullifier.set(nullifiers[1], activity);
      }
    }

    // Index cross-chain 2:1 withdrawal intents by BOTH nullifiers
    if (isCrosschainWithdraw2Intent(activity) && hasSpentNullifiers(activity)) {
      const nullifiers = activity.spentNullifiers;
      if (nullifiers[0]) {
        index.crosschainWithdraw2IntentsByNullifier.set(nullifiers[0], activity);
      }
      if (nullifiers[1]) {
        index.crosschainWithdraw2IntentsByNullifier.set(nullifiers[1], activity);
      }
    }

    // Index cross-chain withdrawal fills by orderId (for reconciler)
    if (isCrosschainWithdrawalFill(activity) && "orderId" in activity && activity.orderId) {
      index.withdrawalFillsByOrderId.set(activity.orderId, activity);
    }

    // Index cross-chain withdrawal refunds by orderId (for reconciler)
    if (isCrosschainWithdrawalRefund(activity) && "orderId" in activity && activity.orderId) {
      index.withdrawalRefundsByOrderId.set(activity.orderId, activity);
    }

    // Index ragequit by commitment hash
    if (isRagequitActivity(activity) && "commitment" in activity && activity.commitment) {
      index.ragequitByCommitment.set(activity.commitment, activity);
    }
  }

  return index;
}
