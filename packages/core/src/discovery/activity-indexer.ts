/**
 * @shinobi-cash/core/discovery
 * Activity indexing for fast lookups during discovery
 */

import type { Activity } from '@shinobi-cash/data';

// ============================================================================
// Activity Index Type
// ============================================================================

export interface ActivityIndex {
  /** Same-chain 1:1 withdrawals indexed by spentNullifier */
  sameChainWithdrawalsByNullifier: Map<string, Activity>;
  /** Pending cross-chain 1:1 withdrawals indexed by spentNullifier */
  pendingWithdrawalsByNullifier: Map<string, Activity>;
  /** Filled cross-chain 1:1 withdrawals indexed by spentNullifier (when synced after fill) */
  filledWithdrawalsByNullifier: Map<string, Activity>;
  /** Same-chain 2:1 Withdraw2 indexed by BOTH nullifiers */
  sameChainWithdraw2ByNullifier: Map<string, Activity>;
  /** Pending cross-chain 2:1 Withdraw2 indexed by BOTH nullifiers */
  pendingWithdraw2ByNullifier: Map<string, Activity>;
  /** Filled cross-chain 2:1 Withdraw2 indexed by BOTH nullifiers (when synced after fill) */
  filledWithdraw2ByNullifier: Map<string, Activity>;
  /** Deposits indexed by precommitmentHash */
  depositsByPrecommitment: Map<string, Activity>;
  /** Ragequit indexed by commitment hash */
  ragequitByCommitment: Map<string, Activity>;
  /** Cross-chain withdrawals indexed by orderId (for reconciler - prefers filled) */
  withdrawalsByOrderId: Map<string, Activity>;
  /** Cross-chain deposits indexed by orderId (for reconciler - prefers filled) */
  depositsByOrderId: Map<string, Activity>;
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

function isPendingActivity(activity: Activity): boolean {
  return activity.type.endsWith('_PENDING');
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
    sameChainWithdrawalsByNullifier: new Map(),
    pendingWithdrawalsByNullifier: new Map(),
    filledWithdrawalsByNullifier: new Map(),
    sameChainWithdraw2ByNullifier: new Map(),
    pendingWithdraw2ByNullifier: new Map(),
    filledWithdraw2ByNullifier: new Map(),
    depositsByPrecommitment: new Map(),
    ragequitByCommitment: new Map(),
    withdrawalsByOrderId: new Map(),
    depositsByOrderId: new Map(),
  };

  for (const activity of activities) {
    // Index deposits by precommitment
    if (isDepositActivity(activity) && activity.precommitmentHash) {
      index.depositsByPrecommitment.set(activity.precommitmentHash, activity);
    }

    // Index cross-chain deposits by orderId (for reconciler)
    // Filled/refunded overwrites pending (reconciler needs final status)
    if (isDepositActivity(activity) && activity.orderId) {
      const existing = index.depositsByOrderId.get(activity.orderId);
      if (!existing || isPendingActivity(existing)) {
        index.depositsByOrderId.set(activity.orderId, activity);
      }
    }

    // Index 1:1 withdrawals by nullifier into separate maps
    if (is1x1WithdrawalActivity(activity) && activity.spentNullifier) {
      if (activity.type === 'WITHDRAWAL') {
        index.sameChainWithdrawalsByNullifier.set(activity.spentNullifier, activity);
      } else if (activity.type === 'CROSSCHAIN_WITHDRAWAL_PENDING') {
        index.pendingWithdrawalsByNullifier.set(activity.spentNullifier, activity);
      } else if (activity.type === 'CROSSCHAIN_WITHDRAWAL') {
        // Filled cross-chain: indexer converted PENDING→FILLED, need to create intent+resolution
        index.filledWithdrawalsByNullifier.set(activity.spentNullifier, activity);
      }
    }

    // Index 2:1 Withdraw2 by BOTH nullifiers into separate maps
    if (isWithdraw2Activity(activity) && activity.spentNullifier) {
      if (activity.type === 'WITHDRAW2') {
        index.sameChainWithdraw2ByNullifier.set(activity.spentNullifier, activity);
        if (activity.spentNullifier1) {
          index.sameChainWithdraw2ByNullifier.set(activity.spentNullifier1, activity);
        }
      } else if (activity.type === 'CROSSCHAIN_WITHDRAW2_PENDING') {
        index.pendingWithdraw2ByNullifier.set(activity.spentNullifier, activity);
        if (activity.spentNullifier1) {
          index.pendingWithdraw2ByNullifier.set(activity.spentNullifier1, activity);
        }
      } else if (activity.type === 'CROSSCHAIN_WITHDRAW2') {
        // Filled cross-chain: indexer converted PENDING→FILLED, need to create intent+resolution
        index.filledWithdraw2ByNullifier.set(activity.spentNullifier, activity);
        if (activity.spentNullifier1) {
          index.filledWithdraw2ByNullifier.set(activity.spentNullifier1, activity);
        }
      }
    }

    // Index ragequit by commitment hash
    if (isRagequitActivity(activity) && activity.commitment) {
      index.ragequitByCommitment.set(activity.commitment, activity);
    }

    // Index cross-chain withdrawals by orderId (for reconciler)
    // Filled/refunded overwrites pending (reconciler needs final status)
    if (
      (is1x1WithdrawalActivity(activity) || isWithdraw2Activity(activity)) &&
      activity.orderId
    ) {
      const existing = index.withdrawalsByOrderId.get(activity.orderId);
      if (!existing || isPendingActivity(existing)) {
        index.withdrawalsByOrderId.set(activity.orderId, activity);
      }
    }
  }

  return index;
}
