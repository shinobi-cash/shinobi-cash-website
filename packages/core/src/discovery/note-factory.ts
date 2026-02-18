/**
 * @shinobi-cash/core/discovery
 * Factory functions for creating notes from activities
 */

import type {
  DepositActivity,
  CrosschainDepositFillActivity,
  WithdrawActivity,
  Withdraw2Activity,
  CrosschainDepositIntentActivity,
  CrosschainWithdrawIntentActivity,
  CrosschainWithdraw2IntentActivity,
  CrosschainWithdrawalFillActivity,
  RagequitActivity,
  ASPStatus,
} from "@shinobi-cash/data";
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
} from "./types.js";
import { generateSerialNumber, getChainIdFromSerial } from "./types.js";

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
  | WithdrawActivity
  | Withdraw2Activity
  | CrosschainWithdrawIntentActivity
  | CrosschainWithdraw2IntentActivity;

/** Activities that can create a WithdrawalNote (same-chain only) */
export type SameChainWithdrawalActivity = WithdrawActivity | Withdraw2Activity;

/** Activities that can create a WithdrawalIntentNote (cross-chain pending) */
export type PendingCrosschainWithdrawalActivity =
  | CrosschainWithdrawIntentActivity
  | CrosschainWithdraw2IntentActivity;

/** Activities that can create a MergedNote (2:1 Withdraw2) */
export type Withdraw2MergeActivity = Withdraw2Activity | CrosschainWithdraw2IntentActivity;

// ============================================================================
// Deposit Note Creation
// ============================================================================

/** Create a DepositNote from a same-chain deposit activity */
export function createDepositNote(
  activity: DepositActivity,
  depositIndex: number,
  poolAddress: string,
  discoveredAtOffset?: number
): DepositNote {
  const originChainId = activity.chainId;

  return {
    noteType: "deposit",
    serialNumber: generateSerialNumber(originChainId, depositIndex, 0, false),
    poolAddress,
    depositIndex,
    changeIndex: 0,
    amount: activity.amount,
    label: activity.label,
    aspStatus: activity.aspStatus ?? "pending",
    status: "unspent",
    originTimestamp: activity.timestamp,
    originChainId,
    originTransactionHash: activity.txHash,
    precommitmentHash: activity.precommitment,
    activityData: buildActivityMetadata(activity),
    discoveredAtOffset,
  };
}

/**
 * Create a CrosschainDepositNote from a filled cross-chain deposit activity
 *
 * Note: In data-v2, the fill activity only has destination (pool chain) info.
 * The originChainId comes from either:
 * - The scanner's chainId parameter (when discovering fills directly)
 * - The depositIntent.originChainId (when reconciling an intent with its fill)
 */
export function createCrosschainDepositNote(
  activity: CrosschainDepositFillActivity,
  depositIndex: number,
  poolAddress: string,
  discoveredAtOffset?: number,
  originChainId?: string
): CrosschainDepositNote {
  // Fill activity's chainId is the destination (pool chain)
  const destinationChainId = activity.chainId;
  // Origin comes from parameter or defaults to destination (fallback)
  const origin = originChainId ?? destinationChainId;

  return {
    noteType: "crosschainDeposit",
    serialNumber: generateSerialNumber(origin, depositIndex, 0, false),
    poolAddress,
    depositIndex,
    changeIndex: 0,
    amount: activity.amount,
    label: activity.label,
    aspStatus: activity.aspStatus ?? "pending",
    status: "unspent",
    originTimestamp: activity.timestamp,
    originChainId: origin,
    originTransactionHash: activity.txHash, // Fill's txHash (intent txHash not available in fill)
    destinationChainId,
    destinationTransactionHash: activity.txHash,
    destinationTimestamp: activity.timestamp,
    precommitmentHash: activity.precommitment,
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
  parentChangeIndex: number
): WithdrawalNote {
  const originChainId = extractChainId(parentNote.serialNumber);

  return {
    noteType: "withdrawal",
    serialNumber: generateSerialNumber(
      originChainId,
      parentNote.depositIndex,
      parentChangeIndex,
      false
    ),
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: parentChangeIndex,
    amount: "0", // Terminal notes have no remaining balance
    withdrawnAmount: activity.amount,
    originTimestamp: activity.timestamp,
    originChainId: activity.chainId,
    originTransactionHash: activity.txHash,
    recipient: activity.recipient,
    mergedFrom: {},
    activityData: buildActivityMetadata(activity),
  };
}

// ============================================================================
// Cross-chain Withdrawal Note Creation - Terminal
// ============================================================================

/**
 * Create a CrosschainWithdrawalNote (terminal record of filled cross-chain withdrawal)
 *
 * Called from reconciler when a WithdrawalIntentNote gets filled.
 * Origin info comes from the parent intent note, fill info comes from the activity.
 */
export function createCrosschainWithdrawalNote(
  parentNote: WithdrawalIntentNote,
  activity: CrosschainWithdrawalFillActivity,
  parentChangeIndex: number,
  mergedFrom?: Record<string, string>
): CrosschainWithdrawalNote {
  const originChainId = extractChainId(parentNote.serialNumber);

  return {
    noteType: "crosschainWithdrawal",
    serialNumber: generateSerialNumber(
      originChainId,
      parentNote.depositIndex,
      parentChangeIndex,
      false
    ),
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: parentChangeIndex,
    amount: "0", // Terminal notes have no remaining balance
    withdrawnAmount: parentNote.amount, // Use intent's amount (fill doesn't have withdrawn amount)
    originTimestamp: parentNote.originTimestamp,
    originChainId: parentNote.originChainId,
    originTransactionHash: parentNote.originTransactionHash,
    destinationChainId: activity.chainId, // Fill happens on destination chain
    destinationTransactionHash: activity.txHash,
    destinationTimestamp: activity.timestamp,
    recipient: activity.recipient,
    mergedFrom: mergedFrom ?? {},
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
  remaining: bigint
): ChangeNote {
  const originChainId = extractChainId(parentNote.serialNumber);

  return {
    noteType: "change",
    serialNumber: generateSerialNumber(
      originChainId,
      parentNote.depositIndex,
      newChangeIndex,
      false
    ),
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: newChangeIndex,
    amount: remaining.toString(),
    label: parentNote.label,
    aspStatus: parentNote.aspStatus,
    status: remaining > 0n ? "unspent" : "spent",
    originTimestamp: activity.timestamp,
    originChainId,
    originTransactionHash: activity.txHash,
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
  mergedFromAmount: bigint
): ChangeNote {
  const originChainId = extractChainId(winnerNote.serialNumber);

  return {
    noteType: "change",
    serialNumber: generateSerialNumber(
      originChainId,
      winnerNote.depositIndex,
      newChangeIndex,
      false
    ),
    poolAddress: winnerNote.poolAddress,
    depositIndex: winnerNote.depositIndex,
    changeIndex: newChangeIndex,
    amount: remaining.toString(),
    label: winnerNote.label,
    aspStatus: winnerNote.aspStatus,
    status: remaining > 0n ? "unspent" : "spent",
    originTimestamp: activity.timestamp,
    originChainId,
    originTransactionHash: activity.txHash,
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
  mergedIntoSerialNumber: string
): MergedNote {
  return {
    noteType: "merged",
    serialNumber: loserNote.serialNumber,
    poolAddress: loserNote.poolAddress,
    depositIndex: loserNote.depositIndex,
    changeIndex: loserNote.changeIndex,
    amount: "0", // Terminal notes have no remaining balance
    contributedAmount: loserNote.amount,
    originTimestamp: activity.timestamp,
    originChainId: activity.chainId,
    originTransactionHash: activity.txHash,
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
  activity: RagequitActivity
): RagequitNote {
  return {
    noteType: "ragequit",
    serialNumber: parentNote.serialNumber,
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: parentNote.changeIndex,
    amount: "0", // Terminal notes have no remaining balance
    ragequitAmount: parentNote.amount,
    originTimestamp: activity.timestamp,
    originChainId: activity.chainId,
    originTransactionHash: activity.txHash,
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
  parentChangeIndex: number
): WithdrawalIntentNote {
  const originChainId = extractChainId(parentNote.serialNumber);
  // Intent activity doesn't have destinationChainId - use recipient's chain from solver info
  // For now, default to origin since we don't have destination info in the intent
  const destinationChainId = originChainId;

  return {
    noteType: "withdrawalIntent",
    serialNumber: generateSerialNumber(
      originChainId,
      parentNote.depositIndex,
      parentChangeIndex,
      true
    ),
    poolAddress: parentNote.poolAddress,
    depositIndex: parentNote.depositIndex,
    changeIndex: parentChangeIndex,
    amount: activity.amount,
    originTimestamp: activity.timestamp,
    originChainId: activity.chainId,
    originTransactionHash: activity.txHash,
    destinationChainId,
    orderId: activity.orderId,
    fillDeadline: activity.timestamp, // TODO: Intent activity should have fillDeadline
    expires: activity.timestamp, // TODO: Intent activity should have expires
    refundCommitment: activity.refundCommitment,
    activityData: buildActivityMetadata(activity),
    // Track merge type for reconciler to know if this is 2:1
    mergeType: activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT" ? "2:1" : "1:1",
  };
}

/** Create a DepositIntentNote (pending cross-chain deposit) */
export function createDepositIntentNote(
  activity: CrosschainDepositIntentActivity,
  depositIndex: number,
  poolAddress: string,
  discoveredAtOffset?: number
): DepositIntentNote {
  const originChainId = activity.chainId;
  const destinationChainId = activity.destinationChainId;

  return {
    noteType: "depositIntent",
    serialNumber: generateSerialNumber(originChainId, depositIndex, 0, true),
    poolAddress,
    depositIndex,
    changeIndex: 0,
    amount: activity.amount,
    originTimestamp: activity.timestamp,
    originChainId,
    originTransactionHash: activity.txHash,
    destinationChainId,
    orderId: activity.orderId,
    fillDeadline: activity.timestamp, // TODO: Get from /v2/intents endpoint
    expires: activity.timestamp, // TODO: Get from /v2/intents endpoint
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
  aspStatus: ASPStatus
): WithdrawalRefundedNote {
  const originChainId = extractChainId(withdrawalIntent.serialNumber);

  return {
    noteType: "withdrawalRefunded",
    serialNumber: generateSerialNumber(
      originChainId,
      withdrawalIntent.depositIndex,
      withdrawalIntent.changeIndex,
      false
    ),
    poolAddress: withdrawalIntent.poolAddress,
    depositIndex: withdrawalIntent.depositIndex,
    changeIndex: withdrawalIntent.changeIndex,
    amount: withdrawalIntent.amount,
    label,
    aspStatus,
    status: "unspent",
    originTimestamp: withdrawalIntent.originTimestamp,
    originChainId: withdrawalIntent.originChainId,
    originTransactionHash: withdrawalIntent.originTransactionHash,
    refundCommitment: withdrawalIntent.refundCommitment,
    activityData: withdrawalIntent.activityData,
  };
}

/** Create a DepositRefundedNote (terminal record of refunded cross-chain deposit) */
export function createDepositRefundedNote(depositIntent: DepositIntentNote): DepositRefundedNote {
  return {
    noteType: "depositRefunded",
    serialNumber: depositIntent.serialNumber,
    poolAddress: depositIntent.poolAddress,
    depositIndex: depositIntent.depositIndex,
    changeIndex: depositIntent.changeIndex,
    amount: "0", // Terminal notes have no remaining balance
    refundedAmount: depositIntent.amount,
    originTimestamp: depositIntent.originTimestamp,
    originChainId: depositIntent.originChainId,
    originTransactionHash: depositIntent.originTransactionHash,
    activityData: depositIntent.activityData,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build ActivityMetadata from an activity item.
 * data-v2 uses string types, so no conversion needed.
 */
function buildActivityMetadata(activity: {
  originalAmount?: string;
  amount?: string;
  withdrawnValue?: string;
  vettingFeeAmount?: string;
  relayFee?: string;
  solverFee?: string;
  user?: string;
  recipient?: string;
  relayer?: string;
  solver?: string;
  vettingFeeRecipient?: string;
  commitment?: string;
  spentNullifiers?: readonly string[];
  newCommitment?: string;
}): ActivityMetadata {
  return {
    originalAmount: activity.originalAmount,
    withdrawnAmount: activity.withdrawnValue ?? activity.amount,
    vettingFeeAmount: activity.vettingFeeAmount,
    relayFeeAmount: activity.relayFee,
    solverFeeAmount: activity.solverFee,
    user: activity.user,
    recipient: activity.recipient,
    relayer: activity.relayer,
    solver: activity.solver,
    vettingFeeRecipient: activity.vettingFeeRecipient,
    commitment: activity.commitment,
    spentNullifier: activity.spentNullifiers?.[0],
    newCommitment: activity.newCommitment,
  };
}

/**
 * Build ActivityMetadata for Withdraw2 activities.
 * Includes both nullifiers from the spentNullifiers array.
 */
function buildWithdraw2ActivityMetadata(activity: {
  originalAmount?: string;
  amount?: string;
  withdrawnValue?: string;
  vettingFeeAmount?: string;
  relayFee?: string;
  solverFee?: string;
  user?: string;
  recipient?: string;
  relayer?: string;
  solver?: string;
  vettingFeeRecipient?: string;
  commitment?: string;
  spentNullifiers?: readonly string[];
  newCommitment?: string;
}): ActivityMetadata {
  return {
    ...buildActivityMetadata(activity),
    spentNullifier1: activity.spentNullifiers?.[1],
  };
}
