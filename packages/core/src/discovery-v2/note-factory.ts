/**
 * @shinobi-cash/core/discovery-v2
 * Factory functions for creating notes from activities
 */

import type { Activity } from '@shinobi-cash/data';
import type { DepositNote, ChangeNote, Note, ActivityMetadata } from './types.js';

// ============================================================================
// Deposit Note Creation
// ============================================================================

/**
 * Create a DepositNote from a deposit activity
 */
export function createDepositNote(
  activity: Activity,
  depositIndex: number,
  poolAddress: string,
): DepositNote {
  if (!activity.precommitmentHash) {
    throw new Error(`Activity must have precommitmentHash to create DepositNote (depositIndex: ${depositIndex})`);
  }

  const originChainId = activity.originChainId.toString();
  const destChainId = (activity.destinationChainId || activity.originChainId).toString();
  const isCrossChain =
    activity.type === 'CROSSCHAIN_DEPOSIT' ||
    activity.type === 'CROSSCHAIN_DEPOSIT_PENDING' ||
    originChainId !== destChainId;

  return {
    noteType: 'deposit',
    poolAddress,
    depositIndex,
    changeIndex: 0,
    amount: activity.amount?.toString() || '0',
    label: activity.label || `Pending Deposit #${depositIndex}`,
    status: 'unspent',
    blockNumber: activity.blockNumber.toString(),
    timestamp: activity.timestamp.toString(),
    originTransactionHash: activity.originTransactionHash,
    destinationTransactionHash: activity.destinationTransactionHash || activity.originTransactionHash,
    originChainId,
    destinationChainId: destChainId,
    isCrossChain,
    orderId: activity.orderId ?? undefined,
    intentStatus: isCrossChain ? (activity.intentStatus ?? 'pending') : undefined,
    fillDeadline: activity.fillDeadline?.toString(),
    expires: activity.expires?.toString(),
    aspStatus: activity.aspStatus,
    precommitmentHash: activity.precommitmentHash,
    activityData: buildActivityMetadata(activity),
  };
}

// ============================================================================
// Change Note Creation (1:1 Withdrawal)
// ============================================================================

/**
 * Create a ChangeNote from a 1:1 withdrawal activity
 */
export function createChangeNote(
  parentNote: Note,
  activity: Activity,
  newChangeIndex: number,
  remaining: bigint,
): ChangeNote {
  return {
    noteType: 'change',
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: newChangeIndex,
    amount: remaining.toString(),
    label: parentNote.label,
    status: remaining > 0n ? 'unspent' : 'spent',
    blockNumber: activity.blockNumber.toString(),
    timestamp: activity.timestamp.toString(),
    originTransactionHash: activity.originTransactionHash,
    destinationTransactionHash: activity.destinationTransactionHash || activity.originTransactionHash,
    originChainId: activity.originChainId.toString(),
    destinationChainId: (activity.destinationChainId || activity.originChainId).toString(),
    isCrossChain: parentNote.isCrossChain,
    orderId: parentNote.orderId,
    intentStatus: parentNote.isCrossChain ? (activity.intentStatus ?? 'filled') : undefined,
    aspStatus: parentNote.aspStatus,
    refundCommitment: activity.refundCommitment ?? undefined,
    activityData: buildActivityMetadata(activity),
  };
}

// ============================================================================
// Change Note Creation (2:1 Withdraw2)
// ============================================================================

/**
 * Create a ChangeNote from a Withdraw2 activity (winner chain)
 * @param winnerNote - The last note from the winning chain
 * @param activity - The Withdraw2 activity
 * @param newChangeIndex - The new change index for the change note
 * @param remaining - Combined value minus withdrawn amount
 * @param mergedFromDepositIndex - The depositIndex of the chain that was merged
 */
export function createWithdraw2ChangeNote(
  winnerNote: Note,
  activity: Activity,
  newChangeIndex: number,
  remaining: bigint,
  mergedFromDepositIndex: number,
): ChangeNote {
  const isCrossChain =
    winnerNote.isCrossChain ||
    activity.type === 'CROSSCHAIN_WITHDRAW2' ||
    activity.type === 'CROSSCHAIN_WITHDRAW2_PENDING';

  return {
    noteType: 'change',
    poolAddress: winnerNote.poolAddress,
    depositIndex: winnerNote.depositIndex,
    changeIndex: newChangeIndex,
    amount: remaining.toString(),
    label: winnerNote.label,
    status: remaining > 0n ? 'unspent' : 'spent',
    blockNumber: activity.blockNumber.toString(),
    timestamp: activity.timestamp.toString(),
    originTransactionHash: activity.originTransactionHash,
    destinationTransactionHash: activity.destinationTransactionHash || activity.originTransactionHash,
    originChainId: activity.originChainId.toString(),
    destinationChainId: (activity.destinationChainId || activity.originChainId).toString(),
    isCrossChain,
    orderId: activity.orderId ?? winnerNote.orderId,
    intentStatus: isCrossChain ? (activity.intentStatus ?? 'filled') : undefined,
    aspStatus: winnerNote.aspStatus,
    refundCommitment: activity.refundCommitment ?? undefined,
    mergedFromDepositIndex,
    activityData: buildWithdraw2ActivityMetadata(activity),
  };
}

// ============================================================================
// Helpers
// ============================================================================

function buildActivityMetadata(activity: Activity): ActivityMetadata {
  return {
    originalAmount: activity.originalAmount?.toString(),
    vettingFeeAmount: activity.vettingFeeAmount?.toString(),
    relayFeeAmount: activity.relayFeeAmount?.toString(),
    solverFeeAmount: activity.solverFeeAmount?.toString(),
    paymasterFeeRefund: activity.paymasterFeeRefund?.toString(),
    user: activity.user,
    recipient: activity.recipient ?? undefined,
    relayer: activity.relayer ?? undefined,
    solver: activity.solver ?? undefined,
    vettingFeeRecipient: activity.vettingFeeRecipient ?? undefined,
    commitment: activity.commitment ?? undefined,
    spentNullifier: activity.spentNullifier ?? undefined,
    newCommitment: activity.newCommitment ?? undefined,
    isSponsored: activity.isSponsored ?? undefined,
  };
}

function buildWithdraw2ActivityMetadata(activity: Activity): ActivityMetadata {
  return {
    ...buildActivityMetadata(activity),
    spentNullifier1: activity.spentNullifier1 ?? undefined,
  };
}
