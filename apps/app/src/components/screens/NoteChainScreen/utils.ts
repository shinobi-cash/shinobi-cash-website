/**
 * Utility functions for NoteChainScreen
 */

import type { NoteChain, Note, ChangeNote } from "@shinobi-cash/core/discovery";
import { getTxExplorerUrl, getChainName } from "@/config/chains";
import { isDepositIntentNote, isWithdrawalIntentNote, isRefundNote } from "@/utils/noteFiltering";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import type { CrossChainStep, TimelineEntry } from "./types";

/**
 * Check if a transaction is cross-chain.
 * Cross-chain = originChainId !== destinationChainId
 */
export function isCrossChain(note: Note): boolean {
  return note.originChainId !== note.destinationChainId;
}

/**
 * Get the correct chain ID for a transaction link.
 * When destinationTransactionHash falls back to originTransactionHash,
 * the tx is actually on the origin chain (e.g., pending cross-chain).
 */
export function getTxChainId(note: Note): string {
  return note.destinationTransactionHash === note.originTransactionHash
    ? note.originChainId
    : note.destinationChainId;
}

/**
 * Build cross-chain steps for a cross-chain deposit.
 * Shows Deposited on origin chain and Confirmed on pool chain.
 */
export function buildCrossChainDepositSteps(depositNote: Note): CrossChainStep[] {
  const steps: CrossChainStep[] = [];

  const isFilled = depositNote.destinationTransactionHash !== depositNote.originTransactionHash;

  steps.push({
    label: "Deposited",
    txHash: depositNote.originTransactionHash,
    txUrl: getTxExplorerUrl(depositNote.originChainId, depositNote.originTransactionHash),
    chainName: getChainName(depositNote.originChainId),
    timestamp: depositNote.timestamp,
    dotColor: isFilled ? "bg-emerald-400" : "bg-amber-400",
  });

  if (isFilled) {
    steps.push({
      label: "Confirmed",
      txHash: depositNote.destinationTransactionHash,
      txUrl: getTxExplorerUrl(depositNote.destinationChainId, depositNote.destinationTransactionHash),
      chainName: getChainName(depositNote.destinationChainId),
      timestamp: depositNote.timestamp,
      dotColor: "bg-emerald-400",
    });
  } else {
    steps.push({
      label: "Confirmation pending",
      txHash: "",
      txUrl: "",
      chainName: getChainName(depositNote.destinationChainId),
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

  const isFilled =
    pendingNote?.intentStatus === "filled" ||
    changeNote.destinationTransactionHash !== changeNote.originTransactionHash;

  steps.push({
    label: "Escrowed",
    txHash: changeNote.originTransactionHash,
    txUrl: getTxExplorerUrl(POOL_CHAIN.id.toString(), changeNote.originTransactionHash),
    chainName: getChainName(POOL_CHAIN.id.toString()),
    timestamp: changeNote.timestamp,
    dotColor: isFilled ? "bg-emerald-400" : "bg-amber-400",
  });

  if (isFilled) {
    const fillTxHash = pendingNote?.destinationTransactionHash || changeNote.destinationTransactionHash;
    const fillChainId = changeNote.destinationChainId;
    const fillTimestamp = pendingNote?.timestamp || changeNote.timestamp;

    steps.push({
      label: "Delivered",
      txHash: fillTxHash,
      txUrl: getTxExplorerUrl(fillChainId, fillTxHash),
      chainName: getChainName(fillChainId),
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
      chainName: getChainName(changeNote.destinationChainId),
      timestamp: "",
      dotColor: "bg-neutral-500",
    });
  }

  return steps;
}

/**
 * Build timeline entries from a note chain
 */
export function buildTimelineEntries(noteChain: NoteChain): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const firstNote = noteChain[0];
  const skipIndices = new Set<number>();

  // First entry: Deposit
  const isDepositCrossChain = isCrossChain(firstNote);

  // Check if this is a pending deposit intent (DepositIntentNote with intentStatus='pending')
  const isDepositPending =
    isDepositIntentNote(firstNote) && firstNote.intentStatus === "pending";

  // Determine label based on cross-chain and pending status
  const getDepositLabel = (): string => {
    if (!isDepositCrossChain) return "Deposited";
    if (isDepositPending) return "Crosschain Deposit (Pending)";
    return "Crosschain Deposited";
  };

  // Use amber dot for pending deposits, emerald for completed
  const depositDotColor = isDepositPending ? "bg-amber-400" : "bg-emerald-400";

  entries.push({
    key: `deposit-${firstNote.depositIndex}`,
    label: getDepositLabel(),
    amount: BigInt(firstNote.amount),
    prefix: "+",
    dotColor: depositDotColor,
    txHash: firstNote.destinationTransactionHash,
    txUrl: getTxExplorerUrl(getTxChainId(firstNote), firstNote.destinationTransactionHash),
    timestamp: firstNote.timestamp,
    note: firstNote,
    crossChainSteps: isDepositCrossChain ? buildCrossChainDepositSteps(firstNote) : undefined,
  });

  // Subsequent entries
  for (let i = 1; i < noteChain.length; i++) {
    if (skipIndices.has(i)) continue;

    const prevNote = noteChain[i - 1];
    const note = noteChain[i];

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
      continue;
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
      continue;
    }

    // Handle DepositNote at index > 0
    // This occurs when a pending deposit intent is filled - the reconciler appends
    // a DepositNote after the spent DepositIntentNote. Skip it since the first
    // entry already represents the deposit.
    if (note.noteType === "deposit") {
      continue;
    }

    const changeNote = note as ChangeNote;
    const mergedFromNoteIndex = changeNote.mergedFromDepositIndex;
    const isMergedNote =
      note.status === "merged" &&
      "mergedIntoDepositIndex" in note &&
      note.mergedIntoDepositIndex !== undefined;

    const nextNote = noteChain[i + 1];
    const hasPendingIntent = nextNote && isWithdrawalIntentNote(nextNote);
    const isCrossChainWithdrawal = isCrossChain(note);

    const crossChainSteps = isCrossChainWithdrawal
      ? buildCrossChainWithdrawalSteps(
          note,
          hasPendingIntent ? (nextNote as Note & { intentStatus?: string }) : undefined,
        )
      : undefined;

    if (hasPendingIntent) {
      skipIndices.add(i + 1);
    }

    if (isMergedNote) {
      const contributedAmount = BigInt(prevNote.amount);

      // Check intent status for cross-chain merged withdrawals
      const mergedIntentStatus = hasPendingIntent
        ? (nextNote as Note & { intentStatus?: string }).intentStatus
        : undefined;
      const isMergedIntentPending = mergedIntentStatus === "pending";

      const getMergedLabel = (): string => {
        if (isCrossChainWithdrawal) {
          return isMergedIntentPending
            ? "Merged + Crosschain Withdrawal (Pending)"
            : "Merged + Crosschain Withdrew";
        }
        return "Merged + Withdrew";
      };

      entries.push({
        key: `merged-${note.depositIndex}-${note.changeIndex}`,
        label: getMergedLabel(),
        amount: contributedAmount,
        prefix: "-",
        dotColor: isMergedIntentPending ? "bg-amber-400" : "bg-violet-400",
        txHash: note.destinationTransactionHash,
        txUrl: getTxExplorerUrl(getTxChainId(note), note.destinationTransactionHash),
        timestamp: note.timestamp,
        note: note,
        isMerged: true,
        mergedIntoNoteIndex: changeNote.mergedIntoDepositIndex,
        fees: {
          relayFee: note.activityData.relayFeeAmount,
          solverFee: note.activityData.solverFeeAmount,
          vettingFee: note.activityData.vettingFeeAmount,
        },
        crossChainSteps,
      });
    } else {
      const withdrawnAmount = BigInt(prevNote.amount) - BigInt(note.amount);

      // Determine intent status for cross-chain withdrawals
      const intentStatus = hasPendingIntent
        ? (nextNote as Note & { intentStatus?: string }).intentStatus
        : undefined;
      const isIntentPending = intentStatus === "pending";

      const getWithdrawalLabel = (): string => {
        // For cross-chain withdrawals, check if intent is still pending
        if (isCrossChainWithdrawal) {
          const baseLabel = isIntentPending ? "Crosschain Withdrawal (Pending)" : "Crosschain Withdrew";
          if (mergedFromNoteIndex !== undefined) {
            return `Merged + ${baseLabel}`;
          }
          return baseLabel;
        }
        // Same-chain withdrawal
        const withdrawType = "Withdrew";
        if (mergedFromNoteIndex !== undefined) {
          return `Merged + ${withdrawType}`;
        }
        return withdrawType;
      };

      // Use amber dot for pending withdrawals, rose for completed
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
        txHash: note.destinationTransactionHash,
        txUrl: getTxExplorerUrl(getTxChainId(note), note.destinationTransactionHash),
        timestamp: note.timestamp,
        note: note,
        mergedFromNoteIndex: mergedFromNoteIndex,
        fees: {
          relayFee: note.activityData.relayFeeAmount,
          solverFee: note.activityData.solverFeeAmount,
          vettingFee: note.activityData.vettingFeeAmount,
        },
        crossChainSteps,
      });
    }
  }

  // Check for ragequit
  const lastNote = noteChain[noteChain.length - 1];
  if (lastNote.status === "spent" && lastNote.activityData.ragequitTxHash) {
    entries.push({
      key: `ragequit-${lastNote.depositIndex}-${lastNote.changeIndex}`,
      label: "Withdrew Publicly",
      amount: BigInt(lastNote.amount),
      prefix: "-",
      dotColor: "bg-orange-400",
      txHash: lastNote.activityData.ragequitTxHash,
      txUrl: getTxExplorerUrl(lastNote.destinationChainId, lastNote.activityData.ragequitTxHash),
      timestamp: lastNote.activityData.ragequitTimestamp || lastNote.timestamp,
      note: lastNote,
    });
  }

  return entries;
}
