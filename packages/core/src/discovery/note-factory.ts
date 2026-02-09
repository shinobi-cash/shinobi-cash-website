/**
 * @shinobi-cash/core/discovery
 * Factory functions for creating notes from activities
 */

import type { Activity } from '@shinobi-cash/data';
import type {
  DepositNote,
  ChangeNote,
  DepositIntentNote,
  WithdrawalIntentNote,
  RefundNote,
  Note,
  ActivityMetadata,
} from './types.js';

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
    // Inherit originChainId from parent - this is the deposit's origin chain, not the withdrawal tx chain
    originChainId: parentNote.originChainId,
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
 * @param mergedFromOriginChainId - The originChainId of the chain that was merged
 * @param mergedFromAmount - The amount contributed from the merged note
 */
export function createWithdraw2ChangeNote(
  winnerNote: Note,
  activity: Activity,
  newChangeIndex: number,
  remaining: bigint,
  mergedFromDepositIndex: number,
  mergedFromOriginChainId: string,
  mergedFromAmount: bigint,
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
    // Inherit originChainId from winner note - this is the deposit's origin chain
    originChainId: winnerNote.originChainId,
    destinationChainId: (activity.destinationChainId || activity.originChainId).toString(),
    isCrossChain,
    orderId: activity.orderId ?? winnerNote.orderId,
    intentStatus: isCrossChain ? (activity.intentStatus ?? 'filled') : undefined,
    aspStatus: winnerNote.aspStatus,
    refundCommitment: activity.refundCommitment ?? undefined,
    mergedFromDepositIndex,
    mergedFromOriginChainId,
    mergedFromAmount: mergedFromAmount.toString(),
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
 * @param mergedIntoOriginChainId - The originChainId of the primary chain this was merged into
 */
export function createMergedNote(
  loserNote: Note,
  activity: Activity,
  newChangeIndex: number,
  mergedIntoDepositIndex: number,
  mergedIntoOriginChainId: string,
): ChangeNote {
  const isCrossChainWithdraw =
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
    // Withdraw2 tx is always on pool chain (activity.originChainId)
    originTransactionHash: activity.originTransactionHash,
    originChainId: activity.originChainId.toString(),
    // Only set destination fields for cross-chain withdrawals
    destinationTransactionHash: isCrossChainWithdraw ? activity.destinationTransactionHash : undefined,
    destinationChainId: isCrossChainWithdraw ? activity.destinationChainId?.toString() : undefined,
    isCrossChain: isCrossChainWithdraw,
    orderId: activity.orderId ?? loserNote.orderId,
    intentStatus: isCrossChainWithdraw ? (activity.intentStatus ?? 'filled') : undefined,
    aspStatus: loserNote.aspStatus,
    mergedIntoDepositIndex,
    mergedIntoOriginChainId,
    activityData: buildWithdraw2ActivityMetadata(activity),
  };
}

// ============================================================================
// Withdrawal Intent Note Creation
// ============================================================================

/**
 * Create a WithdrawalIntentNote for escrowed funds in a cross-chain withdrawal.
 * This note is a sibling of the ChangeNote, both branching from the spent note.
 *
 * @param parentNote - The note being spent (for depositIndex, label, poolAddress)
 * @param activity - The withdrawal Activity (for amount, orderId, refundCommitment, deadlines)
 * @param parentChangeIndex - The changeIndex of the spent note (for derivation path)
 */
export function createWithdrawalIntentNote(
  parentNote: Note,
  activity: Activity,
  parentChangeIndex: number,
): WithdrawalIntentNote {
  return {
    noteType: 'withdrawalIntent',
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
    // Inherit originChainId from parent - this is the deposit's origin chain
    originChainId: parentNote.originChainId,
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
// Deposit Intent Note Creation
// ============================================================================

/**
 * Create a DepositIntentNote for a cross-chain deposit that hasn't been filled yet.
 * This represents funds escrowed on the origin chain, awaiting solver fill.
 *
 * @param activity - The CROSSCHAIN_DEPOSIT_PENDING activity
 * @param depositIndex - The discovered deposit index
 * @param poolAddress - The pool address
 * @param discoveredAtOffset - Optional offset where discovered
 */
export function createDepositIntentNote(
  activity: Activity,
  depositIndex: number,
  poolAddress: string,
  discoveredAtOffset?: number,
): DepositIntentNote {
  const originChainId = activity.originChainId.toString();
  const destChainId = (activity.destinationChainId || activity.originChainId).toString();

  return {
    noteType: 'depositIntent',
    poolAddress,
    depositIndex,
    changeIndex: 0, // First note in chain
    amount: (activity.amount || 0n).toString(),
    label: activity.label?.toString(), // Usually undefined for pending
    status: 'unspent',
    blockNumber: activity.blockNumber.toString(),
    timestamp: activity.timestamp.toString(),
    originTransactionHash: activity.originTransactionHash,
    destinationTransactionHash: activity.destinationTransactionHash || activity.originTransactionHash,
    originChainId,
    destinationChainId: destChainId,
    isCrossChain: true,
    orderId: activity.orderId ?? '',
    intentStatus: activity.intentStatus ?? 'pending',
    fillDeadline: activity.fillDeadline?.toString(),
    expires: activity.expires?.toString(),
    aspStatus: activity.aspStatus,
    refundCommitment: activity.refundCommitment?.toString(),
    activityData: buildActivityMetadata(activity),
    discoveredAtOffset,
  };
}


// ============================================================================
// Refund Note Creation
// ============================================================================

/**
 * Create a RefundNote from a WithdrawalIntentNote when the refund has been executed.
 * The refundCommitment is now in the pool's merkle tree and can be spent.
 *
 * Note: Only WithdrawalIntentNote can create RefundNote because:
 * - Withdrawal intents escrow funds on the pool chain, refund goes back to pool
 * - Deposit intents escrow on origin chain, refund goes to user's wallet on origin chain
 *
 * @param withdrawalIntent - The WithdrawalIntentNote that is being refunded
 * @param refundIndex - Index for this refund (0 for first refund from this position)
 */
export function createRefundNote(
  withdrawalIntent: WithdrawalIntentNote,
  refundIndex: number = 0,
): RefundNote {
  return {
    noteType: 'refund',
    poolAddress: withdrawalIntent.poolAddress,
    depositIndex: withdrawalIntent.depositIndex,
    changeIndex: withdrawalIntent.parentChangeIndex, // Same derivation path as WithdrawalIntentNote
    refundIndex,
    amount: withdrawalIntent.amount, // Refunded amount
    label: withdrawalIntent.label,
    status: 'unspent', // Can be spent!
    refundCommitment: withdrawalIntent.refundCommitment,
    // Use same blockchain metadata as the withdrawal intent
    blockNumber: withdrawalIntent.blockNumber,
    timestamp: withdrawalIntent.timestamp,
    originTransactionHash: withdrawalIntent.originTransactionHash,
    destinationTransactionHash: withdrawalIntent.originTransactionHash, // Refund is on pool chain
    originChainId: withdrawalIntent.originChainId,
    destinationChainId: withdrawalIntent.originChainId, // Back to pool chain
    isCrossChain: false, // Refund is on pool chain
    // Preserve orderId for idempotency checks
    orderId: withdrawalIntent.orderId,
    aspStatus: withdrawalIntent.aspStatus,
    activityData: withdrawalIntent.activityData,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function buildActivityMetadata(activity: Activity): ActivityMetadata {
  return {
    originalAmount: activity.originalAmount?.toString(),
    // Store actual withdrawn amount from activity.amount (for withdrawals)
    withdrawnAmount: activity.amount?.toString(),
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
