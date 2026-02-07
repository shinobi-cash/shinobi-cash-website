/**
 * @shinobi-cash/core/discovery
 * Factory functions for creating notes from activities
 */

import type { Activity } from '@shinobi-cash/data';
import type { DepositNote, ChangeNote, PendingIntentNote, RefundNote, Note, ActivityMetadata } from './types.js';

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
  discoveredAtOffset?: number,
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
    label: activity.label?.toString(), // undefined for unfilled cross-chain deposit intents
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
    discoveredAtOffset,
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
// Merged Note Creation (Secondary chain in Withdraw2)
// ============================================================================

/**
 * Create a ChangeNote for the secondary (merged) chain in a Withdraw2
 * This note has amount=0 and status='merged', linked to the primary chain
 * @param loserNote - The last note from the chain being merged
 * @param activity - The Withdraw2 activity
 * @param newChangeIndex - The new change index for the merged note
 * @param mergedIntoDepositIndex - The depositIndex of the primary chain this was merged into
 */
export function createMergedNote(
  loserNote: Note,
  activity: Activity,
  newChangeIndex: number,
  mergedIntoDepositIndex: number,
): ChangeNote {
  const isCrossChain =
    loserNote.isCrossChain ||
    activity.type === 'CROSSCHAIN_WITHDRAW2' ||
    activity.type === 'CROSSCHAIN_WITHDRAW2_PENDING';

  return {
    noteType: 'change',
    poolAddress: loserNote.poolAddress,
    depositIndex: loserNote.depositIndex,
    changeIndex: newChangeIndex,
    amount: '0', // Balance is 0 - fully merged into primary chain
    label: loserNote.label,
    status: 'merged',
    blockNumber: activity.blockNumber.toString(),
    timestamp: activity.timestamp.toString(),
    originTransactionHash: activity.originTransactionHash,
    destinationTransactionHash: activity.destinationTransactionHash || activity.originTransactionHash,
    originChainId: activity.originChainId.toString(),
    destinationChainId: (activity.destinationChainId || activity.originChainId).toString(),
    isCrossChain,
    orderId: activity.orderId ?? loserNote.orderId,
    intentStatus: isCrossChain ? (activity.intentStatus ?? 'filled') : undefined,
    aspStatus: loserNote.aspStatus,
    mergedIntoDepositIndex,
    activityData: buildWithdraw2ActivityMetadata(activity),
  };
}

// ============================================================================
// Pending Intent Note Creation
// ============================================================================

/**
 * Create a PendingIntentNote for escrowed funds in a cross-chain withdrawal.
 * This note is a sibling of the ChangeNote, both branching from the spent note.
 *
 * @param parentNote - The note being spent (for depositIndex, label, poolAddress)
 * @param activity - The withdrawal Activity (for amount, orderId, refundCommitment, deadlines)
 * @param parentChangeIndex - The changeIndex of the spent note (for derivation path)
 */
export function createPendingIntentNote(
  parentNote: Note,
  activity: Activity,
  parentChangeIndex: number,
): PendingIntentNote {
  return {
    noteType: 'pendingIntent',
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: parentChangeIndex, // Same as parentChangeIndex for Note union compatibility
    parentChangeIndex,
    amount: (activity.amount || 0n).toString(),
    label: parentNote.label,
    status: 'unspent',
    blockNumber: activity.blockNumber.toString(),
    timestamp: activity.timestamp.toString(),
    originTransactionHash: activity.originTransactionHash,
    destinationTransactionHash: activity.destinationTransactionHash || activity.originTransactionHash,
    originChainId: activity.originChainId.toString(),
    destinationChainId: (activity.destinationChainId || activity.originChainId).toString(),
    isCrossChain: true,
    orderId: activity.orderId ?? '',
    intentStatus: activity.intentStatus ?? 'pending',
    fillDeadline: activity.fillDeadline?.toString(),
    expires: activity.expires?.toString(),
    aspStatus: parentNote.aspStatus,
    refundCommitment: activity.refundCommitment?.toString() ?? '',
    activityData: buildActivityMetadata(activity),
  };
}

// ============================================================================
// Refund Note Creation
// ============================================================================

/**
 * Create a RefundNote from a PendingIntentNote when the refund has been executed.
 * The refundCommitment is now in the pool's merkle tree and can be spent.
 *
 * @param pendingIntent - The PendingIntentNote that is being refunded
 * @param refundIndex - Index for this refund (0 for first refund from this position)
 */
export function createRefundNote(
  pendingIntent: PendingIntentNote,
  refundIndex: number = 0,
): RefundNote {
  return {
    noteType: 'refund',
    poolAddress: pendingIntent.poolAddress,
    depositIndex: pendingIntent.depositIndex,
    changeIndex: pendingIntent.parentChangeIndex, // Same derivation path as PendingIntentNote
    refundIndex,
    amount: pendingIntent.amount, // Refunded amount
    label: pendingIntent.label,
    status: 'unspent', // Can be spent!
    refundCommitment: pendingIntent.refundCommitment,
    // Use same blockchain metadata as the pending intent
    blockNumber: pendingIntent.blockNumber,
    timestamp: pendingIntent.timestamp,
    originTransactionHash: pendingIntent.originTransactionHash,
    destinationTransactionHash: pendingIntent.originTransactionHash, // Refund is on pool chain
    originChainId: pendingIntent.originChainId,
    destinationChainId: pendingIntent.originChainId, // Back to pool chain
    isCrossChain: false, // Refund is on pool chain
    aspStatus: pendingIntent.aspStatus,
    activityData: pendingIntent.activityData,
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
