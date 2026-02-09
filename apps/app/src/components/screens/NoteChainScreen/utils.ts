/**
 * Utility functions for NoteChainScreen
 */

import type { NoteTree, NoteNode, Note, ChangeNote } from "@shinobi-cash/core/discovery";
import { traverseTree } from "@shinobi-cash/core/discovery";
import { getTxExplorerUrl, getChainName } from "@/config/chains";
import { isDepositIntentNote, isWithdrawalIntentNote, isRefundNote } from "@/utils/noteFiltering";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import type { CrossChainStep, TimelineEntry } from "./types";

/**
 * Check if a deposit was cross-chain.
 * Cross-chain deposit = originChainId !== destinationChainId
 */
export function isCrossChainDeposit(note: Note): boolean {
  // If no destinationChainId, it's same-chain
  if (!note.destinationChainId) return false;
  return note.originChainId !== note.destinationChainId;
}

/**
 * Get the correct chain ID for a transaction link.
 * - Same-chain: use originChainId (destinationChainId is undefined)
 * - Cross-chain: use destinationChainId if destination tx exists, else originChainId
 */
export function getTxChainId(note: Note): string {
  if (!note.isCrossChain) {
    return note.originChainId;
  }
  // Cross-chain: use destination if destination tx exists
  return note.destinationTransactionHash
    ? note.destinationChainId!
    : note.originChainId;
}

/**
 * Build cross-chain steps for a cross-chain deposit.
 * Shows Deposited on origin chain and Confirmed on pool chain.
 */
export function buildCrossChainDepositSteps(depositNote: Note): CrossChainStep[] {
  const steps: CrossChainStep[] = [];

  // Cross-chain deposits always have destination fields set
  const destChainId = depositNote.destinationChainId!;
  const destTxHash = depositNote.destinationTransactionHash;
  const isFilled = destTxHash !== undefined && destTxHash !== depositNote.originTransactionHash;

  steps.push({
    label: "Escrowed",
    txHash: depositNote.originTransactionHash,
    txUrl: getTxExplorerUrl(depositNote.originChainId, depositNote.originTransactionHash),
    chainName: getChainName(depositNote.originChainId),
    timestamp: depositNote.timestamp,
    dotColor: isFilled ? "bg-emerald-400" : "bg-amber-400",
  });

  if (isFilled) {
    steps.push({
      label: "Filled",
      txHash: destTxHash,
      txUrl: getTxExplorerUrl(destChainId, destTxHash),
      chainName: getChainName(destChainId),
      timestamp: depositNote.timestamp,
      dotColor: "bg-emerald-400",
    });
  } else {
    steps.push({
      label: "Fill pending",
      txHash: "",
      txUrl: "",
      chainName: getChainName(destChainId),
      timestamp: "",
      dotColor: "bg-neutral-500",
    });
  }

  return steps;
}

/**
 * Build cross-chain steps for a cross-chain withdrawal.
 * Shows Escrowed step from ChangeNote, and Delivered/Refunded/Pending status.
 */
export function buildCrossChainWithdrawalSteps(
  changeNote: Note,
  pendingNote?: Note & { intentStatus?: string },
): CrossChainStep[] {
  const steps: CrossChainStep[] = [];

  // Cross-chain withdrawals always have destination fields set
  const destChainId = changeNote.destinationChainId!;
  const destTxHash = changeNote.destinationTransactionHash;
  const isFilled =
    pendingNote?.intentStatus === "filled" ||
    (destTxHash !== undefined && destTxHash !== changeNote.originTransactionHash);

  steps.push({
    label: "Escrowed",
    txHash: changeNote.originTransactionHash,
    txUrl: getTxExplorerUrl(POOL_CHAIN.id.toString(), changeNote.originTransactionHash),
    chainName: getChainName(POOL_CHAIN.id.toString()),
    timestamp: changeNote.timestamp,
    dotColor: isFilled ? "bg-emerald-400" : "bg-amber-400",
  });

  if (isFilled) {
    const fillTxHash = pendingNote?.destinationTransactionHash ?? destTxHash!;
    const fillTimestamp = pendingNote?.timestamp || changeNote.timestamp;

    steps.push({
      label: "Delivered",
      txHash: fillTxHash,
      txUrl: getTxExplorerUrl(destChainId, fillTxHash),
      chainName: getChainName(destChainId),
      timestamp: fillTimestamp,
      dotColor: "bg-emerald-400",
    });
  } else if (pendingNote?.intentStatus === "refunded") {
    steps.push({
      label: "Refunded",
      txHash: pendingNote.originTransactionHash,
      txUrl: getTxExplorerUrl(pendingNote.originChainId, pendingNote.originTransactionHash),
      chainName: getChainName(pendingNote.originChainId),
      timestamp: pendingNote.timestamp,
      dotColor: "bg-orange-400",
    });
  } else {
    steps.push({
      label: "Delivery pending",
      txHash: "",
      txUrl: "",
      chainName: getChainName(destChainId),
      timestamp: "",
      dotColor: "bg-neutral-500",
    });
  }

  return steps;
}

/**
 * Build timeline entries from a note tree.
 * Traverses the tree in parent-first order to build a chronological timeline.
 */
export function buildTimelineEntries(noteTree: NoteTree): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const processedNodes = new Set<NoteNode>();

  // Helper to find sibling WithdrawalIntentNote for cross-chain withdrawal display
  const findSiblingIntent = (node: NoteNode): NoteNode | undefined => {
    if (!node.parent) return undefined;
    return node.parent.children.find(
      (sibling) => sibling !== node && isWithdrawalIntentNote(sibling.note)
    );
  };

  // Traverse tree in depth-first order
  traverseTree(noteTree, (node) => {
    if (processedNodes.has(node)) return;
    processedNodes.add(node);

    const note = node.note;

    // Handle root deposit note (first note in tree)
    if (node.parent === null) {
      const isDepositCrossChain = isCrossChainDeposit(note);
      const isDepositPending = isDepositIntentNote(note) && note.intentStatus === "pending";

      // For filled deposit intents, find the DepositNote child
      const depositNoteForSteps = isDepositIntentNote(note) && note.intentStatus === "filled"
        ? node.children.find((c) => c.note.noteType === "deposit")?.note ?? note
        : note;

      const getDepositLabel = (): string => {
        if (!isDepositCrossChain) return "Deposited";
        if (isDepositPending) return "Crosschain Deposit (Pending)";
        return "Crosschain Deposited";
      };

      const depositDotColor = isDepositPending ? "bg-amber-400" : "bg-emerald-400";

      entries.push({
        key: `deposit-${note.depositIndex}`,
        label: getDepositLabel(),
        amount: BigInt(depositNoteForSteps.amount),
        prefix: "+",
        dotColor: depositDotColor,
        // For deposits, use origin tx (same-chain) or destination tx (filled cross-chain)
        txHash: depositNoteForSteps.destinationTransactionHash ?? depositNoteForSteps.originTransactionHash,
        txUrl: getTxExplorerUrl(getTxChainId(depositNoteForSteps), depositNoteForSteps.destinationTransactionHash ?? depositNoteForSteps.originTransactionHash),
        timestamp: depositNoteForSteps.timestamp,
        note: depositNoteForSteps,
        crossChainSteps: isDepositCrossChain ? buildCrossChainDepositSteps(depositNoteForSteps) : undefined,
      });

      // Check for ragequit on root deposit note
      if (note.status === "ragequit" && note.activityData.ragequitTxHash) {
        // Use ragequitAmount (stored before zeroing) or fallback to note.amount
        const ragequitAmount = note.activityData.ragequitAmount || note.amount;
        entries.push({
          key: `ragequit-${note.depositIndex}-${note.changeIndex}`,
          label: "Ragequit",
          amount: BigInt(ragequitAmount),
          prefix: "-",
          dotColor: "bg-orange-400",
          txHash: note.activityData.ragequitTxHash,
          txUrl: getTxExplorerUrl(POOL_CHAIN.id.toString(), note.activityData.ragequitTxHash),
          timestamp: note.activityData.ragequitTimestamp || note.timestamp,
          note: note,
        });
      }
      return;
    }

    // Skip DepositNote children of DepositIntentNote (already handled above)
    if (note.noteType === "deposit" && isDepositIntentNote(node.parent.note)) {
      return;
    }

    // Handle WithdrawalIntentNote (escrowed cross-chain withdrawal)
    if (isWithdrawalIntentNote(note)) {
      const getIntentLabel = (): string => {
        switch (note.intentStatus) {
          case "filled":
            return "Delivered (Cross-chain)";
          case "refunded":
            return "Refunded (Cross-chain)";
          default:
            return "Escrowed (Cross-chain)";
        }
      };
      const getIntentDotColor = (): string => {
        switch (note.intentStatus) {
          case "filled":
            return "bg-emerald-400";
          case "refunded":
            return "bg-orange-400";
          default:
            return "bg-amber-400";
        }
      };

      const isFilled = note.intentStatus === "filled";
      const txHash = isFilled ? note.destinationTransactionHash : note.originTransactionHash;
      const txChainId = isFilled ? note.destinationChainId : note.originChainId;

      entries.push({
        key: `pending-intent-${note.depositIndex}-${note.changeIndex}`,
        label: getIntentLabel(),
        amount: BigInt(note.amount),
        prefix: "-",
        dotColor: getIntentDotColor(),
        txHash,
        txUrl: getTxExplorerUrl(txChainId, txHash),
        timestamp: note.timestamp,
        note: note,
      });
      return;
    }

    // Handle RefundNote
    if (isRefundNote(note)) {
      entries.push({
        key: `refund-${note.depositIndex}-${note.changeIndex}-${note.refundIndex}`,
        label: "Refunded",
        amount: BigInt(note.amount),
        prefix: "+",
        dotColor: "bg-orange-400",
        txHash: note.originTransactionHash,
        txUrl: getTxExplorerUrl(note.originChainId, note.originTransactionHash),
        timestamp: note.timestamp,
        note: note,
      });
      return;
    }

    // Handle ChangeNote (withdrawal)
    const changeNote = note as ChangeNote;
    const parentNote = node.parent.note;
    const mergedFromNoteIndex = changeNote.mergedFromDepositIndex;
    const isMergedNote =
      note.status === "merged" &&
      "mergedIntoDepositIndex" in note &&
      note.mergedIntoDepositIndex !== undefined;

    // Check for sibling intent note (cross-chain withdrawal)
    const siblingIntent = findSiblingIntent(node);
    // Use note.isCrossChain - set correctly in note-factory based on activity type
    const isWithdrawalCrossChain = note.isCrossChain;

    const crossChainSteps = isWithdrawalCrossChain
      ? buildCrossChainWithdrawalSteps(
          note,
          siblingIntent ? (siblingIntent.note as Note & { intentStatus?: string }) : undefined,
        )
      : undefined;

    if (isMergedNote) {
      const contributedAmount = BigInt(parentNote.amount);

      const mergedIntentStatus = siblingIntent
        ? (siblingIntent.note as Note & { intentStatus?: string }).intentStatus
        : undefined;
      const isMergedIntentPending = mergedIntentStatus === "pending";

      const getMergedLabel = (): string => {
        if (isWithdrawalCrossChain) {
          return isMergedIntentPending
            ? "Crosschain Withdrawal (Pending)"
            : "Crosschain Withdrew";
        }
        return "Withdrew";
      };

      entries.push({
        key: `merged-${note.depositIndex}-${note.changeIndex}`,
        label: getMergedLabel(),
        amount: contributedAmount,
        prefix: "-",
        dotColor: isMergedIntentPending ? "bg-amber-400" : "bg-violet-400",
        // Withdraw2 tx is originTransactionHash (on pool chain)
        txHash: note.originTransactionHash,
        txUrl: getTxExplorerUrl(getTxChainId(note), note.originTransactionHash),
        timestamp: note.timestamp,
        note: note,
        isMerged: true,
        // For loser note: show merge icon with winner chain label
        mergedIntoNoteIndex: changeNote.mergedIntoDepositIndex,
        mergedIntoChainId: changeNote.mergedIntoOriginChainId,
        fees: {
          relayFee: note.activityData.relayFeeAmount,
          solverFee: note.activityData.solverFeeAmount,
          vettingFee: note.activityData.vettingFeeAmount,
        },
        crossChainSteps,
      });
    } else {
      // Calculate withdrawn amount:
      // - Prefer withdrawnAmount from activityData (actual amount from activity)
      // - Fallback: calculate parent - note amounts (only works for 1:1 withdrawals)
      let withdrawnAmount: bigint;

      if (note.activityData.withdrawnAmount) {
        // Use actual withdrawn amount from activity
        withdrawnAmount = BigInt(note.activityData.withdrawnAmount);
      } else {
        // Fallback: calculate from parent - note (may be wrong for Withdraw2)
        const calculatedAmount = BigInt(parentNote.amount) - BigInt(note.amount);
        withdrawnAmount = calculatedAmount < BigInt(0) ? -calculatedAmount : calculatedAmount;
      }

      const intentStatus = siblingIntent
        ? (siblingIntent.note as Note & { intentStatus?: string }).intentStatus
        : undefined;
      const isIntentPending = intentStatus === "pending";

      const getWithdrawalLabel = (): string => {
        if (isWithdrawalCrossChain) {
          return isIntentPending ? "Crosschain Withdrawal (Pending)" : "Crosschain Withdrew";
        }
        return "Withdrew";
      };

      const dotColor =
        mergedFromNoteIndex !== undefined
          ? "bg-violet-400"
          : isIntentPending
            ? "bg-amber-400"
            : "bg-rose-400";

      entries.push({
        key: `withdraw-${note.depositIndex}-${note.changeIndex}`,
        label: getWithdrawalLabel(),
        amount: withdrawnAmount,
        prefix: "-",
        dotColor,
        // Withdrawal tx is originTransactionHash (on pool chain)
        txHash: note.originTransactionHash,
        txUrl: getTxExplorerUrl(getTxChainId(note), note.originTransactionHash),
        timestamp: note.timestamp,
        note: note,
        mergedFromNoteIndex: mergedFromNoteIndex,
        mergedFromChainId: changeNote.mergedFromOriginChainId,
        fees: {
          relayFee: note.activityData.relayFeeAmount,
          solverFee: note.activityData.solverFeeAmount,
          vettingFee: note.activityData.vettingFeeAmount,
        },
        crossChainSteps,
      });
    }

    // Check for ragequit on this note
    if (note.status === "ragequit" && note.activityData.ragequitTxHash) {
      // Use ragequitAmount (stored before zeroing) or fallback to note.amount
      const ragequitAmount = note.activityData.ragequitAmount || note.amount;
      entries.push({
        key: `ragequit-${note.depositIndex}-${note.changeIndex}`,
        label: "Ragequit",
        amount: BigInt(ragequitAmount),
        prefix: "-",
        dotColor: "bg-orange-400",
        txHash: note.activityData.ragequitTxHash,
        // Ragequit always happens on pool chain
        txUrl: getTxExplorerUrl(POOL_CHAIN.id.toString(), note.activityData.ragequitTxHash),
        timestamp: note.activityData.ragequitTimestamp || note.timestamp,
        note: note,
      });
    }
  });

  return entries;
}
