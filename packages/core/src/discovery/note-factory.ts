/**
 * @shinobi-cash/core/discovery
 * Factory functions for creating notes from activities
 */

import type {
  DepositActivity,
  CrossChainDepositActivity,
  WithdrawalActivity,
  Withdraw2Activity,
  CrossChainWithdrawalActivity,
  CrossChainWithdraw2Activity,
  CrossChainDepositPendingActivity,
  CrossChainWithdrawalPendingActivity,
  CrossChainWithdraw2PendingActivity,
  RagequitActivity,
} from '@shinobi-cash/data';
import type {
  DepositNote,
  CrosschainDepositNote,
  WithdrawalNote,
  CrosschainWithdrawalNote,
  ChangeNote,
  DepositIntentNote,
  WithdrawalIntentNote,
  WithdrawalRefundedNote,
  RagequitNote,
  MergedNote,
  DepositRefundedNote,
  ActivityMetadata,
} from './types.js';
import { generateSerialNumber, getChainIdFromSerial } from './types.js';

// ============================================================================
// Helpers
// ============================================================================

/** Extract chain ID from serial number, throws if invalid */
function extractChainId(serialNumber: string): string {
  const chainId = getChainIdFromSerial(serialNumber);
  if (!chainId) {
    throw new Error(`Invalid serial number format: ${serialNumber}`);
  }
  return chainId;
}

// ============================================================================
// Activity Type Aliases (exported for type assertions in chain-extender)
// ============================================================================

/** Activities that can create a ChangeNote */
export type ChangeActivity =
  | WithdrawalActivity
  | Withdraw2Activity
  | CrossChainWithdrawalActivity
  | CrossChainWithdraw2Activity
  | CrossChainWithdrawalPendingActivity
  | CrossChainWithdraw2PendingActivity;

/** Activities that can create a WithdrawalNote */
export type SameChainWithdrawalActivity = WithdrawalActivity | Withdraw2Activity;

/** Activities that can create a CrosschainWithdrawalNote */
export type FilledCrosschainWithdrawalActivity = CrossChainWithdrawalActivity | CrossChainWithdraw2Activity;

/** Activities that can create a WithdrawalIntentNote */
export type PendingCrosschainWithdrawalActivity = CrossChainWithdrawalPendingActivity | CrossChainWithdraw2PendingActivity;

/** Activities that can create a MergedNote (2:1 Withdraw2) */
export type Withdraw2MergeActivity = Withdraw2Activity | CrossChainWithdraw2Activity | CrossChainWithdraw2PendingActivity;

// ============================================================================
// Deposit Note Creation
// ============================================================================

/** Create a DepositNote from a same-chain deposit activity */
export function createDepositNote(
  activity: DepositActivity,
  depositIndex: number,
  poolAddress: string,
  discoveredAtOffset?: number,
): DepositNote {
  const originChainId = activity.originChainId.toString();

  return {
    noteType: 'deposit',
    serialNumber: generateSerialNumber(originChainId, depositIndex, 0, false),
    poolAddress,
    depositIndex,
    changeIndex: 0,
    amount: activity.amount.toString(),
    label: activity.label,
    aspStatus: activity.aspStatus,
    status: 'unspent',
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId,
    originTransactionHash: activity.originTransactionHash,
    precommitmentHash: activity.precommitmentHash,
    activityData: buildActivityMetadata(activity),
    discoveredAtOffset,
  };
}

/** Create a CrosschainDepositNote from a filled cross-chain deposit activity */
export function createCrosschainDepositNote(
  activity: CrossChainDepositActivity,
  depositIndex: number,
  poolAddress: string,
  discoveredAtOffset?: number,
): CrosschainDepositNote {
  const originChainId = activity.originChainId.toString();
  const destinationChainId = activity.destinationChainId.toString();

  return {
    noteType: 'crosschainDeposit',
    serialNumber: generateSerialNumber(originChainId, depositIndex, 0, false),
    poolAddress,
    depositIndex,
    changeIndex: 0,
    amount: activity.amount.toString(),
    label: activity.label,
    aspStatus: activity.aspStatus,
    status: 'unspent',
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId,
    originTransactionHash: activity.originTransactionHash,
    destinationChainId,
    destinationTransactionHash: activity.destinationTransactionHash,
    destinationBlockNumber: activity.blockNumber.toString(),
    destinationTimestamp: activity.timestamp.toString(),
    precommitmentHash: activity.precommitmentHash,
    activityData: buildActivityMetadata(activity),
    discoveredAtOffset,
  };
}

// ============================================================================
// Withdrawal Note Creation (Same-chain) - Terminal
// ============================================================================

/** Create a WithdrawalNote (terminal record of same-chain withdrawal) */
export function createWithdrawalNote(
  parentNote: DepositNote | CrosschainDepositNote | ChangeNote | WithdrawalRefundedNote,
  activity: SameChainWithdrawalActivity,
  parentChangeIndex: number,
): WithdrawalNote {
  const originChainId = extractChainId(parentNote.serialNumber);

  return {
    noteType: 'withdrawal',
    serialNumber: generateSerialNumber(originChainId, parentNote.depositIndex, parentChangeIndex, false),
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: parentChangeIndex,
    amount: '0', // Terminal notes have no remaining balance
    withdrawnAmount: activity.amount.toString(),
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId: activity.originChainId.toString(),
    originTransactionHash: activity.originTransactionHash,
    recipient: activity.recipient,
    mergedFrom: {},
    activityData: buildActivityMetadata(activity),
  };
}

// ============================================================================
// Cross-chain Withdrawal Note Creation - Terminal
// ============================================================================

/** Create a CrosschainWithdrawalNote (terminal record of filled cross-chain withdrawal) */
export function createCrosschainWithdrawalNote(
  parentNote: DepositNote | CrosschainDepositNote | ChangeNote | WithdrawalRefundedNote | WithdrawalIntentNote,
  activity: FilledCrosschainWithdrawalActivity,
  parentChangeIndex: number,
): CrosschainWithdrawalNote {
  const originChainId = extractChainId(parentNote.serialNumber);

  return {
    noteType: 'crosschainWithdrawal',
    serialNumber: generateSerialNumber(originChainId, parentNote.depositIndex, parentChangeIndex, false),
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: parentChangeIndex,
    amount: '0', // Terminal notes have no remaining balance
    withdrawnAmount: activity.amount.toString(),
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId: activity.originChainId.toString(),
    originTransactionHash: activity.originTransactionHash,
    destinationChainId: activity.destinationChainId.toString(),
    destinationTransactionHash: activity.destinationTransactionHash,
    destinationBlockNumber: activity.blockNumber.toString(),
    destinationTimestamp: activity.timestamp.toString(),
    recipient: activity.recipient,
    mergedFrom: {},
    activityData: buildActivityMetadata(activity),
  };
}

// ============================================================================
// Change Note Creation (1:1 Withdrawal)
// ============================================================================

/** Create a ChangeNote (remaining balance after withdrawal) */
export function createChangeNote(
  parentNote: DepositNote | CrosschainDepositNote | ChangeNote | WithdrawalRefundedNote,
  activity: ChangeActivity,
  newChangeIndex: number,
  remaining: bigint,
): ChangeNote {
  const originChainId = extractChainId(parentNote.serialNumber);

  return {
    noteType: 'change',
    serialNumber: generateSerialNumber(originChainId, parentNote.depositIndex, newChangeIndex, false),
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: newChangeIndex,
    amount: remaining.toString(),
    label: parentNote.label,
    aspStatus: parentNote.aspStatus,
    status: remaining > 0n ? 'unspent' : 'spent',
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId: activity.originChainId.toString(),
    originTransactionHash: activity.originTransactionHash,
    mergedFrom: {},
    activityData: buildActivityMetadata(activity),
  };
}

// ============================================================================
// Change Note Creation (2:1 Withdraw2) - Winner Chain
// ============================================================================

/** Create a ChangeNote from Withdraw2 (winner chain with merged funds) */
export function createWithdraw2ChangeNote(
  winnerNote: DepositNote | CrosschainDepositNote | ChangeNote | WithdrawalRefundedNote,
  activity: Withdraw2MergeActivity,
  newChangeIndex: number,
  remaining: bigint,
  mergedFromSerialNumber: string,
  mergedFromAmount: bigint,
): ChangeNote {
  const originChainId = extractChainId(winnerNote.serialNumber);

  return {
    noteType: 'change',
    serialNumber: generateSerialNumber(originChainId, winnerNote.depositIndex, newChangeIndex, false),
    poolAddress: winnerNote.poolAddress,
    depositIndex: winnerNote.depositIndex,
    changeIndex: newChangeIndex,
    amount: remaining.toString(),
    label: winnerNote.label,
    aspStatus: winnerNote.aspStatus,
    status: remaining > 0n ? 'unspent' : 'spent',
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId: activity.originChainId.toString(),
    originTransactionHash: activity.originTransactionHash,
    mergedFrom: { [mergedFromSerialNumber]: mergedFromAmount.toString() },
    activityData: buildWithdraw2ActivityMetadata(activity),
  };
}

// ============================================================================
// Merged Note Creation (2:1 Withdraw2) - Loser Chain - Terminal
// ============================================================================

/** Create a MergedNote (terminal record of loser chain in Withdraw2) */
export function createMergedNote(
  loserNote: DepositNote | CrosschainDepositNote | ChangeNote | WithdrawalRefundedNote,
  activity: Withdraw2MergeActivity,
  mergedIntoSerialNumber: string,
): MergedNote {
  return {
    noteType: 'merged',
    serialNumber: loserNote.serialNumber,
    poolAddress: loserNote.poolAddress,
    depositIndex: loserNote.depositIndex,
    changeIndex: loserNote.changeIndex,
    amount: '0', // Terminal notes have no remaining balance
    contributedAmount: loserNote.amount,
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId: activity.originChainId.toString(),
    originTransactionHash: activity.originTransactionHash,
    mergedIntoSerialNumber,
    activityData: buildWithdraw2ActivityMetadata(activity),
  };
}

// ============================================================================
// Ragequit Note Creation - Terminal
// ============================================================================

/** Create a RagequitNote (terminal record of public withdrawal) */
export function createRagequitNote(
  parentNote: DepositNote | CrosschainDepositNote | ChangeNote | WithdrawalRefundedNote,
  activity: RagequitActivity,
): RagequitNote {
  return {
    noteType: 'ragequit',
    serialNumber: parentNote.serialNumber,
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: parentNote.changeIndex,
    amount: '0', // Terminal notes have no remaining balance
    ragequitAmount: parentNote.amount,
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId: activity.originChainId.toString(),
    originTransactionHash: activity.originTransactionHash,
    recipient: activity.user,
    activityData: buildActivityMetadata(activity),
  };
}

// ============================================================================
// Intent Note Creation
// ============================================================================

/** Create a WithdrawalIntentNote (pending cross-chain withdrawal) */
export function createWithdrawalIntentNote(
  parentNote: DepositNote | CrosschainDepositNote | ChangeNote | WithdrawalRefundedNote,
  activity: PendingCrosschainWithdrawalActivity,
  parentChangeIndex: number,
): WithdrawalIntentNote {
  const originChainId = extractChainId(parentNote.serialNumber);
  const destinationChainId = activity.destinationChainId.toString();

  return {
    noteType: 'withdrawalIntent',
    serialNumber: generateSerialNumber(originChainId, parentNote.depositIndex, parentChangeIndex, true),
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: parentChangeIndex,
    amount: activity.amount.toString(),
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId: activity.originChainId.toString(),
    originTransactionHash: activity.originTransactionHash,
    destinationChainId,
    orderId: activity.orderId,
    fillDeadline: activity.fillDeadline.toString(),
    expires: activity.expires.toString(),
    refundCommitment: activity.refundCommitment,
    activityData: buildActivityMetadata(activity),
  };
}

/** Create a DepositIntentNote (pending cross-chain deposit) */
export function createDepositIntentNote(
  activity: CrossChainDepositPendingActivity,
  depositIndex: number,
  poolAddress: string,
  discoveredAtOffset?: number,
): DepositIntentNote {
  const originChainId = activity.originChainId.toString();
  const destinationChainId = activity.destinationChainId.toString();

  return {
    noteType: 'depositIntent',
    serialNumber: generateSerialNumber(originChainId, depositIndex, 0, true),
    poolAddress,
    depositIndex,
    changeIndex: 0,
    amount: activity.amount.toString(),
    originBlockNumber: activity.blockNumber.toString(),
    originTimestamp: activity.timestamp.toString(),
    originChainId,
    originTransactionHash: activity.originTransactionHash,
    destinationChainId,
    orderId: activity.orderId,
    fillDeadline: activity.fillDeadline.toString(),
    expires: activity.expires.toString(),
    activityData: buildActivityMetadata(activity),
    discoveredAtOffset,
  };
}

// ============================================================================
// Refunded Note Creation
// ============================================================================

/** Create a WithdrawalRefundedNote (spendable refund from failed cross-chain withdrawal) */
export function createWithdrawalRefundedNote(
  withdrawalIntent: WithdrawalIntentNote,
  label: string,
  aspStatus: 'pending' | 'approved' | 'rejected',
): WithdrawalRefundedNote {
  const originChainId = extractChainId(withdrawalIntent.serialNumber);

  return {
    noteType: 'withdrawalRefunded',
    serialNumber: generateSerialNumber(
      originChainId,
      withdrawalIntent.depositIndex,
      withdrawalIntent.changeIndex,
      false,
    ),
    poolAddress: withdrawalIntent.poolAddress,
    depositIndex: withdrawalIntent.depositIndex,
    changeIndex: withdrawalIntent.changeIndex,
    amount: withdrawalIntent.amount,
    label,
    aspStatus,
    status: 'unspent',
    originBlockNumber: withdrawalIntent.originBlockNumber,
    originTimestamp: withdrawalIntent.originTimestamp,
    originChainId: withdrawalIntent.originChainId,
    originTransactionHash: withdrawalIntent.originTransactionHash,
    refundCommitment: withdrawalIntent.refundCommitment,
    activityData: withdrawalIntent.activityData,
  };
}

/** Create a DepositRefundedNote (terminal record of refunded cross-chain deposit) */
export function createDepositRefundedNote(
  depositIntent: DepositIntentNote,
): DepositRefundedNote {
  return {
    noteType: 'depositRefunded',
    serialNumber: depositIntent.serialNumber,
    poolAddress: depositIntent.poolAddress,
    depositIndex: depositIntent.depositIndex,
    changeIndex: depositIntent.changeIndex,
    amount: '0', // Terminal notes have no remaining balance
    refundedAmount: depositIntent.amount,
    originBlockNumber: depositIntent.originBlockNumber,
    originTimestamp: depositIntent.originTimestamp,
    originChainId: depositIntent.originChainId,
    originTransactionHash: depositIntent.originTransactionHash,
    activityData: depositIntent.activityData,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function buildActivityMetadata(activity: {
  originalAmount?: bigint;
  amount?: bigint | null;
  vettingFeeAmount?: bigint;
  relayFeeAmount?: bigint;
  solverFeeAmount?: bigint;
  paymasterFeeRefund?: bigint;
  user?: string;
  recipient?: string;
  relayer?: string;
  solver?: string;
  vettingFeeRecipient?: string;
  commitment?: string;
  spentNullifier?: string;
  newCommitment?: string;
  isSponsored?: boolean;
}): ActivityMetadata {
  return {
    originalAmount: activity.originalAmount?.toString(),
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

function buildWithdraw2ActivityMetadata(activity: {
  originalAmount?: bigint;
  amount?: bigint | null;
  vettingFeeAmount?: bigint;
  relayFeeAmount?: bigint;
  solverFeeAmount?: bigint;
  paymasterFeeRefund?: bigint;
  user?: string;
  recipient?: string;
  relayer?: string;
  solver?: string;
  vettingFeeRecipient?: string;
  commitment?: string;
  spentNullifier?: string;
  spentNullifier1?: string;
  newCommitment?: string;
  isSponsored?: boolean;
}): ActivityMetadata {
  return {
    ...buildActivityMetadata(activity),
    spentNullifier1: activity.spentNullifier1 ?? undefined,
  };
}
