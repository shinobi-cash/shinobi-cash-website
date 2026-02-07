/**
 * @shinobi-cash/core/discovery
 * Activity indexing for fast lookups during discovery
 */

import type { Activity } from '@shinobi-cash/data';

// ============================================================================
// Activity Index Type
// ============================================================================

export interface ActivityIndex {
  /** 1:1 withdrawals indexed by spentNullifier */
  withdrawalsByNullifier: Map<string, Activity>;
  /** 2:1 Withdraw2 indexed by BOTH nullifiers (each maps to same activity) */
  withdraw2ByNullifier: Map<string, Activity>;
  /** Deposits indexed by precommitmentHash */
  depositsByPrecommitment: Map<string, Activity>;
  /** Ragequit indexed by commitment hash */
  ragequitByCommitment: Map<string, Activity>;
  /** Cross-chain withdrawals indexed by orderId (for PendingIntentNote resolution) */
  withdrawalsByOrderId: Map<string, Activity>;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isDepositActivity(activity: Activity): boolean {
  return (
    activity.type === 'DEPOSIT' ||
    activity.type === 'CROSSCHAIN_DEPOSIT' ||
    activity.type === 'CROSSCHAIN_DEPOSIT_PENDING'
  );
}

export function is1x1WithdrawalActivity(activity: Activity): boolean {
  return (
    activity.type === 'WITHDRAWAL' ||
    activity.type === 'CROSSCHAIN_WITHDRAWAL' ||
    activity.type === 'CROSSCHAIN_WITHDRAWAL_PENDING'
  );
}

export function isWithdraw2Activity(activity: Activity): boolean {
  return (
    activity.type === 'WITHDRAW2' ||
    activity.type === 'CROSSCHAIN_WITHDRAW2' ||
    activity.type === 'CROSSCHAIN_WITHDRAW2_PENDING'
  );
}

export function isRagequitActivity(activity: Activity): boolean {
  return activity.type === 'RAGEQUIT';
}

// ============================================================================
// Index Builder
// ============================================================================

/**
 * Build lookup maps from a list of activities
 * Enables O(1) lookups during chain extension
 */
export function buildActivityIndex(activities: Activity[]): ActivityIndex {
  const index: ActivityIndex = {
    withdrawalsByNullifier: new Map(),
    withdraw2ByNullifier: new Map(),
    depositsByPrecommitment: new Map(),
    ragequitByCommitment: new Map(),
    withdrawalsByOrderId: new Map(),
  };

  for (const activity of activities) {
    // Index deposits by precommitment
    if (isDepositActivity(activity) && activity.precommitmentHash) {
      index.depositsByPrecommitment.set(activity.precommitmentHash, activity);
    }

    // Index 1:1 withdrawals by nullifier
    if (is1x1WithdrawalActivity(activity) && activity.spentNullifier) {
      index.withdrawalsByNullifier.set(activity.spentNullifier, activity);
    }

    // Index 2:1 Withdraw2 by BOTH nullifiers
    if (isWithdraw2Activity(activity) && activity.spentNullifier) {
      index.withdraw2ByNullifier.set(activity.spentNullifier, activity);
      if (activity.spentNullifier1) {
        index.withdraw2ByNullifier.set(activity.spentNullifier1, activity);
      }
    }

    // Index ragequit by commitment hash
    if (isRagequitActivity(activity) && activity.commitment) {
      index.ragequitByCommitment.set(activity.commitment, activity);
    }

    // Index cross-chain withdrawals by orderId (for PendingIntentNote resolution)
    if (
      (is1x1WithdrawalActivity(activity) || isWithdraw2Activity(activity)) &&
      activity.orderId
    ) {
      index.withdrawalsByOrderId.set(activity.orderId, activity);
    }
  }

  return index;
}
