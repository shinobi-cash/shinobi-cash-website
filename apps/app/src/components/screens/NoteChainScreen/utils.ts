/**
 * Utility functions for NoteChainScreen
 *
 * Each note type has its own builder function that uses fields directly.
 * No fallback logic - each builder knows exactly what fields to use.
 */

import type {
  NoteTree,
  NoteNode,
  Note,
  DepositNote,
  CrosschainDepositNote,
  DepositIntentNote,
  ChangeNote,
  WithdrawalIntentNote,
  CrosschainWithdrawalNote,
  WithdrawalRefundedNote,
  MergedNote,
  RagequitNote,
} from "@shinobi-cash/core/discovery";
import {
  traverseTree,
  isDepositIntentNote,
  isWithdrawalIntentNote,
  isWithdrawalRefundedNote,
  isDepositNote,
  isCrosschainDepositNote,
  isChangeNote,
  isWithdrawalNote,
  isCrosschainWithdrawalNote,
  isRagequitNote,
  isMergedNote,
} from "@shinobi-cash/core/discovery";
import { getTxExplorerUrl, getChainName } from "@/config/chains";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import type { CrossChainStep, TimelineEntry } from "./types";

// ============================================================================
// Type-Specific Entry Builders
// Each builder uses the note's fields directly - no fallbacks
// ============================================================================

/**
 * Build entry for a DepositNote (same-chain deposit)
 */
function buildDepositNoteEntry(deposit: DepositNote): TimelineEntry {
  return {
    key: `deposit-${deposit.depositIndex}`,
    label: "Deposited",
    amount: BigInt(deposit.amount),
    prefix: "+",
    dotColor: "bg-emerald-400",
    txHash: deposit.originTransactionHash,
    txUrl: getTxExplorerUrl(deposit.originChainId, deposit.originTransactionHash),
    timestamp: deposit.originTimestamp,
    note: deposit,
  };
}

/**
 * Build entry for a CrosschainDepositNote (filled cross-chain deposit)
 */
function buildCrosschainDepositNoteEntry(deposit: CrosschainDepositNote): TimelineEntry {
  return {
    key: `deposit-${deposit.depositIndex}`,
    label: "Crosschain Deposited",
    amount: BigInt(deposit.amount),
    prefix: "+",
    dotColor: "bg-emerald-400",
    txHash: deposit.destinationTransactionHash,
    txUrl: getTxExplorerUrl(deposit.destinationChainId, deposit.destinationTransactionHash),
    timestamp: deposit.destinationTimestamp,
    note: deposit,
    crossChainSteps: buildCrosschainDepositSteps(deposit),
  };
}

/**
 * Build cross-chain steps for a CrosschainDepositNote
 */
function buildCrosschainDepositSteps(deposit: CrosschainDepositNote): CrossChainStep[] {
  return [
    {
      label: "Escrowed",
      txHash: deposit.originTransactionHash,
      txUrl: getTxExplorerUrl(deposit.originChainId, deposit.originTransactionHash),
      chainName: getChainName(deposit.originChainId),
      timestamp: deposit.originTimestamp,
      dotColor: "bg-emerald-400",
    },
    {
      label: "Filled",
      txHash: deposit.destinationTransactionHash,
      txUrl: getTxExplorerUrl(deposit.destinationChainId, deposit.destinationTransactionHash),
      chainName: getChainName(deposit.destinationChainId),
      timestamp: deposit.destinationTimestamp,
      dotColor: "bg-emerald-400",
    },
  ];
}

/**
 * Build entry for a DepositIntentNote (cross-chain deposit)
 * Uses tree structure: intent has escrow tx, filledDeposit child has fill tx
 */
function buildDepositIntentEntry(
  intent: DepositIntentNote,
  filledDeposit?: CrosschainDepositNote
): TimelineEntry {
  // Check if filled by looking for child deposit note
  const isFilled = filledDeposit !== undefined;
  // For display, show the filled deposit note if available
  const displayNote = filledDeposit ?? intent;

  const txHash =
    isFilled && filledDeposit
      ? filledDeposit.destinationTransactionHash
      : intent.originTransactionHash;
  const txChainId =
    isFilled && filledDeposit ? filledDeposit.destinationChainId : intent.originChainId;
  const timestamp =
    isFilled && filledDeposit ? filledDeposit.destinationTimestamp : intent.originTimestamp;

  return {
    key: `deposit-${intent.depositIndex}`,
    label: isFilled ? "Crosschain Deposited" : "Crosschain Deposit (Pending)",
    amount: BigInt(displayNote.amount),
    prefix: "+",
    dotColor: isFilled ? "bg-emerald-400" : "bg-amber-400",
    txHash,
    txUrl: getTxExplorerUrl(txChainId, txHash),
    timestamp,
    note: displayNote,
    crossChainSteps: buildDepositIntentSteps(intent, filledDeposit),
  };
}

/**
 * Build cross-chain steps for a DepositIntentNote
 * Uses the intent for escrow info and optional filledDeposit child for fill info
 */
function buildDepositIntentSteps(
  intent: DepositIntentNote,
  filledDeposit?: CrosschainDepositNote
): CrossChainStep[] {
  const isFilled = filledDeposit !== undefined;

  const steps: CrossChainStep[] = [
    {
      label: "Escrowed",
      txHash: intent.originTransactionHash,
      txUrl: getTxExplorerUrl(intent.originChainId, intent.originTransactionHash),
      chainName: getChainName(intent.originChainId),
      timestamp: intent.originTimestamp,
      dotColor: isFilled ? "bg-emerald-400" : "bg-amber-400",
    },
  ];

  if (isFilled && filledDeposit) {
    steps.push({
      label: "Filled",
      txHash: filledDeposit.destinationTransactionHash,
      txUrl: getTxExplorerUrl(
        filledDeposit.destinationChainId,
        filledDeposit.destinationTransactionHash
      ),
      chainName: getChainName(filledDeposit.destinationChainId),
      timestamp: filledDeposit.destinationTimestamp,
      dotColor: "bg-emerald-400",
    });
  } else {
    steps.push({
      label: "Fill pending",
      txHash: "",
      txUrl: "",
      chainName: getChainName(intent.destinationChainId),
      timestamp: "",
      dotColor: "bg-neutral-500",
    });
  }

  return steps;
}

/**
 * Build entry for a pending WithdrawalIntentNote
 * Shows cross-chain withdrawal in pending state with escrow step
 */
function buildPendingIntentEntry(intent: WithdrawalIntentNote): TimelineEntry {
  return {
    key: `intent-${intent.depositIndex}-${intent.changeIndex}`,
    label: "Crosschain Withdrawal (Pending)",
    amount: BigInt(intent.amount),
    prefix: "-",
    dotColor: "bg-amber-400",
    txHash: intent.originTransactionHash,
    txUrl: getTxExplorerUrl(intent.originChainId, intent.originTransactionHash),
    timestamp: intent.originTimestamp,
    note: intent,
    crossChainSteps: [
      {
        label: "Escrowed",
        txHash: intent.originTransactionHash,
        txUrl: getTxExplorerUrl(intent.originChainId, intent.originTransactionHash),
        chainName: getChainName(intent.originChainId),
        timestamp: intent.originTimestamp,
        dotColor: "bg-amber-400",
      },
      {
        label: "Delivery pending",
        txHash: "",
        txUrl: "",
        chainName: getChainName(intent.destinationChainId),
        timestamp: "",
        dotColor: "bg-neutral-500",
      },
    ],
  };
}

/**
 * Build entry for a CrosschainWithdrawalNote (filled cross-chain withdrawal)
 * Shows finalized withdrawal with escrow and fill steps
 */
function buildCrosschainWithdrawalEntry(
  withdrawal: CrosschainWithdrawalNote,
  parentIntent: WithdrawalIntentNote
): TimelineEntry {
  // Check for merge info (cross-chain withdraw2)
  const mergedFromSerialNumbers = Object.keys(withdrawal.mergedFrom);
  const hasMergedFrom = mergedFromSerialNumbers.length > 0;
  const dotColor = hasMergedFrom ? "bg-violet-400" : "bg-rose-400";

  return {
    key: `crosschain-withdraw-${withdrawal.depositIndex}-${withdrawal.changeIndex}`,
    label: "Crosschain Withdrew",
    amount: BigInt(withdrawal.withdrawnAmount),
    prefix: "-",
    dotColor,
    txHash: withdrawal.destinationTransactionHash,
    txUrl: getTxExplorerUrl(withdrawal.destinationChainId, withdrawal.destinationTransactionHash),
    timestamp: withdrawal.destinationTimestamp,
    note: withdrawal,
    mergedFromSerialNumber: mergedFromSerialNumbers[0],
    crossChainSteps: [
      {
        label: "Escrowed",
        txHash: parentIntent.originTransactionHash,
        txUrl: getTxExplorerUrl(parentIntent.originChainId, parentIntent.originTransactionHash),
        chainName: getChainName(parentIntent.originChainId),
        timestamp: parentIntent.originTimestamp,
        dotColor: "bg-emerald-400",
      },
      {
        label: "Delivered",
        txHash: withdrawal.destinationTransactionHash,
        txUrl: getTxExplorerUrl(
          withdrawal.destinationChainId,
          withdrawal.destinationTransactionHash
        ),
        chainName: getChainName(withdrawal.destinationChainId),
        timestamp: withdrawal.destinationTimestamp,
        dotColor: "bg-emerald-400",
      },
    ],
  };
}

/**
 * Build entry for a WithdrawalRefundedNote (child of refunded WithdrawalIntentNote)
 */
function buildRefundEntry(refund: WithdrawalRefundedNote): TimelineEntry {
  return {
    key: `refund-${refund.depositIndex}-${refund.changeIndex}`,
    label: "Refunded",
    amount: BigInt(refund.amount),
    prefix: "+",
    dotColor: "bg-orange-400",
    txHash: refund.originTransactionHash,
    txUrl: getTxExplorerUrl(refund.originChainId, refund.originTransactionHash),
    timestamp: refund.originTimestamp,
    note: refund,
  };
}

/**
 * Build entry for a ChangeNote (same-chain withdrawal)
 * Shows the withdrawal amount for same-chain withdrawals.
 * Cross-chain withdrawals are displayed via WithdrawalIntentNote/CrosschainWithdrawalNote.
 */
function buildChangeEntry(change: ChangeNote, parentNote: Note): TimelineEntry {
  // Calculate withdrawn amount
  const withdrawnAmount = change.activityData.withdrawnAmount
    ? BigInt(change.activityData.withdrawnAmount)
    : BigInt(parentNote.amount) - BigInt(change.amount);

  // Determine dot color - check mergedFrom map for merge winner
  const hasMergedFrom = Object.keys(change.mergedFrom).length > 0;
  const dotColor = hasMergedFrom ? "bg-violet-400" : "bg-rose-400";

  // Get merged info from the mergedFrom map
  const mergedFromSerialNumbers = Object.keys(change.mergedFrom);

  return {
    key: `withdraw-${change.depositIndex}-${change.changeIndex}`,
    label: "Withdrew",
    amount: withdrawnAmount < BigInt(0) ? -withdrawnAmount : withdrawnAmount,
    prefix: "-",
    dotColor,
    txHash: change.originTransactionHash,
    txUrl: getTxExplorerUrl(change.originChainId, change.originTransactionHash),
    timestamp: change.originTimestamp,
    note: change,
    mergedFromSerialNumber: mergedFromSerialNumbers[0],
    fees: {
      relayFee: change.activityData.relayFeeAmount,
      solverFee: change.activityData.solverFeeAmount,
      vettingFee: change.activityData.vettingFeeAmount,
    },
  };
}

/**
 * Build entry for a MergedNote (Withdraw2 loser chain - terminal)
 */
function buildMergedNoteEntry(merged: MergedNote): TimelineEntry {
  // Use the explicit contributedAmount field from MergedNote
  const contributedAmount = BigInt(merged.contributedAmount);

  return {
    key: `merged-${merged.depositIndex}-${merged.changeIndex}`,
    label: "Merged (Withdrew)",
    amount: contributedAmount,
    prefix: "-",
    dotColor: "bg-violet-400",
    txHash: merged.originTransactionHash,
    txUrl: getTxExplorerUrl(merged.originChainId, merged.originTransactionHash),
    timestamp: merged.originTimestamp,
    note: merged,
    isMerged: true,
    mergedIntoSerialNumber: merged.mergedIntoSerialNumber,
  };
}

/**
 * Build entry for a RagequitNote (child of spent spendable note)
 */
function buildRagequitEntry(ragequit: RagequitNote): TimelineEntry {
  return {
    key: `ragequit-${ragequit.depositIndex}-${ragequit.changeIndex}`,
    label: "Ragequit",
    amount: BigInt(ragequit.ragequitAmount),
    prefix: "-",
    dotColor: "bg-orange-400",
    txHash: ragequit.originTransactionHash,
    txUrl: getTxExplorerUrl(POOL_CHAIN.id.toString(), ragequit.originTransactionHash),
    timestamp: ragequit.originTimestamp,
    note: ragequit,
  };
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Build timeline entries from a note tree.
 * Dispatches to type-specific builders based on note type.
 */
export function buildTimelineEntries(noteTree: NoteTree): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const processedNodes = new Set<NoteNode>();

  // Helper to find RagequitNote child
  const findRagequitChild = (node: NoteNode): RagequitNote | undefined => {
    const ragequitNode = node.children.find((c) => isRagequitNote(c.note));
    return ragequitNode?.note as RagequitNote | undefined;
  };

  traverseTree(noteTree, (node) => {
    if (processedNodes.has(node)) return;
    processedNodes.add(node);

    const note = node.note;

    // Handle root node (deposit)
    if (node.parent === null) {
      if (isDepositIntentNote(note)) {
        // Cross-chain deposit (pending or filled)
        // Look for CrosschainDepositNote child if filled
        const filledDepositNode = node.children.find((c) => isCrosschainDepositNote(c.note));
        const filledDeposit = filledDepositNode?.note as CrosschainDepositNote | undefined;
        entries.push(buildDepositIntentEntry(note, filledDeposit));
      } else if (isCrosschainDepositNote(note)) {
        // Filled cross-chain deposit (discovered as filled)
        entries.push(buildCrosschainDepositNoteEntry(note));
      } else if (isDepositNote(note)) {
        // Same-chain deposit
        entries.push(buildDepositNoteEntry(note));
      }

      // Check for ragequit child on root
      const ragequitNote = findRagequitChild(node);
      if (ragequitNote) entries.push(buildRagequitEntry(ragequitNote));
      return;
    }

    // Skip deposit children of DepositIntentNote (handled above)
    if (
      (isDepositNote(note) || isCrosschainDepositNote(note)) &&
      isDepositIntentNote(node.parent.note)
    ) {
      return;
    }

    // Handle WithdrawalIntentNote (cross-chain withdrawal)
    if (isWithdrawalIntentNote(note)) {
      const hasRefund = node.children.some((c) => isWithdrawalRefundedNote(c.note));
      const hasFill = node.children.some((c) => isCrosschainWithdrawalNote(c.note));

      if (hasFill) {
        // Skip - CrosschainWithdrawalNote child will display the finalized withdrawal
      } else if (hasRefund) {
        // Show refund entry
        const refundNote = node.children.find((c) => isWithdrawalRefundedNote(c.note))
          ?.note as WithdrawalRefundedNote;
        entries.push(buildRefundEntry(refundNote));
      } else {
        // Pending cross-chain withdrawal
        entries.push(buildPendingIntentEntry(note));
      }
      return;
    }

    // Handle CrosschainWithdrawalNote (finalized cross-chain withdrawal)
    if (isCrosschainWithdrawalNote(note)) {
      // Parent should be WithdrawalIntentNote
      if (node.parent && isWithdrawalIntentNote(node.parent.note)) {
        entries.push(buildCrosschainWithdrawalEntry(note, node.parent.note));
      }
      return;
    }

    // Handle WithdrawalRefundedNote (child of refunded WithdrawalIntentNote)
    // Already handled above when processing the intent
    if (isWithdrawalRefundedNote(note)) {
      return;
    }

    // Handle WithdrawalNote (terminal record of same-chain withdrawal)
    // Skip display - the ChangeNote sibling shows the withdrawal
    if (isWithdrawalNote(note)) {
      return;
    }

    // Handle MergedNote (Withdraw2 loser - terminal)
    if (isMergedNote(note)) {
      entries.push(buildMergedNoteEntry(note));
      return;
    }

    // Handle ChangeNote (same-chain withdrawal)
    if (isChangeNote(note)) {
      const parentNote = node.parent.note;
      // Check for sibling WithdrawalIntentNote (cross-chain withdrawal)
      const hasSiblingIntent = node.parent.children.some(
        (sibling) => sibling !== node && isWithdrawalIntentNote(sibling.note)
      );

      // For cross-chain withdrawals, WithdrawalIntentNote displays the withdrawal
      // ChangeNote only shows withdrawal entry for same-chain withdrawals
      if (!hasSiblingIntent) {
        entries.push(buildChangeEntry(note, parentNote));
      }

      // Check for ragequit child
      const ragequitNote = findRagequitChild(node);
      if (ragequitNote) entries.push(buildRagequitEntry(ragequitNote));
    }

    // Handle RagequitNote (terminal record of ragequit)
    // Already handled as child of spendable note
    if (isRagequitNote(note)) {
      return;
    }
  });

  // Sort entries by timestamp (oldest first for chronological history)
  return entries.sort((a, b) => {
    const timestampA = typeof a.timestamp === "bigint" ? a.timestamp : BigInt(a.timestamp || "0");
    const timestampB = typeof b.timestamp === "bigint" ? b.timestamp : BigInt(b.timestamp || "0");
    return timestampA < timestampB ? -1 : timestampA > timestampB ? 1 : 0;
  });
}
