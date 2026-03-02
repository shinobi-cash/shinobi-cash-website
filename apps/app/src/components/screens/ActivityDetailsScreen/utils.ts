/**
 * Utility functions for Activity Details Screen
 */

import type { ActivityItem } from "@shinobi-cash/data";
import type { Note, NoteTree } from "@shinobi-cash/core/discovery";
import { isNote, isMergedNote } from "@shinobi-cash/core/discovery";
import type { ActivityTimelineEvent } from "@/types/activity";
import type { InputNote, WithdrawalNotes } from "./types";
import {
  findNoteByLabel,
  findNoteBySpentNullifier,
  findNoteByCommitment,
  findChangeNoteByTxHash,
  findNoteBySerial,
  findWithdrawalIntentByTxHash,
} from "../NoteChainScreen/note-navigation";

// ============================================
// Activity Type Labels
// ============================================

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAW: "Withdraw",
  WITHDRAW_2: "Withdraw2",
  CROSSCHAIN_DEPOSIT_INTENT: "Crosschain Deposit",
  CROSSCHAIN_DEPOSIT_FILL: "Crosschain Deposit",
  CROSSCHAIN_DEPOSIT_REFUND: "Deposit Refund",
  CROSSCHAIN_WITHDRAW_INTENT: "Crosschain Withdraw",
  CROSSCHAIN_WITHDRAW_2_INTENT: "Crosschain Withdraw2",
  CROSSCHAIN_WITHDRAWAL_FILL: "Crosschain Withdraw",
  CROSSCHAIN_WITHDRAWAL_REFUND: "Withdraw Refund",
  RAGEQUIT: "Ragequit",
};

// ============================================
// Activity Type Helpers
// ============================================

export function isDepositActivity(activity: ActivityItem): boolean {
  return (
    activity.type === "DEPOSIT" ||
    activity.type === "CROSSCHAIN_DEPOSIT_INTENT" ||
    activity.type === "CROSSCHAIN_DEPOSIT_FILL"
  );
}

export function isWithdrawalActivity(activity: ActivityItem): boolean {
  return (
    activity.type === "WITHDRAW" ||
    activity.type === "WITHDRAW_2" ||
    activity.type === "CROSSCHAIN_WITHDRAW_INTENT" ||
    activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT" ||
    activity.type === "CROSSCHAIN_WITHDRAWAL_FILL"
  );
}

export function isMergedWithdrawalActivity(
  activity: ActivityItem,
  timeline?: ActivityTimelineEvent[]
): boolean {
  return (
    activity.type === "WITHDRAW_2" ||
    activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT" ||
    (activity.type === "CROSSCHAIN_WITHDRAWAL_FILL" &&
      timeline?.some((e) => e.activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT")) === true
  );
}

/**
 * Get the display amount for a note.
 * For MergedNote, use contributedAmount since amount is 0.
 */
export function getNoteDisplayAmount(note: Note): string {
  if (isMergedNote(note)) {
    return note.contributedAmount;
  }
  return note.amount;
}

/**
 * Get activity title, handling Withdraw2 fills specially.
 */
export function getActivityTitle(activity: ActivityItem, isMergedWithdrawal: boolean): string {
  if (activity.type === "CROSSCHAIN_WITHDRAWAL_FILL" && isMergedWithdrawal) {
    return "Crosschain Withdraw2";
  }
  return ACTIVITY_TYPE_LABELS[activity.type] ?? "Activity";
}

// ============================================
// Note Lookup Functions
// ============================================

/**
 * Find the created deposit note by label.
 */
export function findCreatedNote(label: string | null, allTrees: NoteTree[]): Note | null {
  if (!label) return null;

  const result = findNoteByLabel(label, allTrees);
  if (!result) return null;

  const rootNote = result.tree.root.note;
  if (isNote(rootNote)) {
    // Same-chain: root is the deposit note
    return rootNote;
  }

  // Crosschain: root is intent, first child is the deposit note
  const firstChild = result.tree.root.children[0]?.note;
  if (firstChild && isNote(firstChild)) {
    return firstChild;
  }

  return null;
}

/**
 * Add input notes from a change note (handles both 1:1 and Withdraw2).
 */
function addInputNotesFromChangeNode(
  changeResult: ReturnType<typeof findChangeNoteByTxHash>,
  inputNotes: InputNote[],
  allTrees: NoteTree[]
): Note | null {
  if (!changeResult || !isNote(changeResult.note)) return null;

  const changeNote = changeResult.note;
  const hasmergedFrom = "mergedFrom" in changeNote && Object.keys(changeNote.mergedFrom).length > 0;

  // Add parent note (winner for Withdraw2, source for 1:1)
  const parentNote = changeResult.node.parent?.note;
  if (parentNote && isNote(parentNote)) {
    inputNotes.push({
      serialNumber: parentNote.serialNumber,
      amount: getNoteDisplayAmount(parentNote),
      note: parentNote,
    });
  }

  // For Withdraw2, also add loser notes from mergedFrom
  if (hasmergedFrom) {
    for (const [serial, amt] of Object.entries(changeNote.mergedFrom)) {
      const noteResult = findNoteBySerial(serial, allTrees);
      inputNotes.push({
        serialNumber: serial,
        amount: amt,
        note: noteResult && isNote(noteResult.note) ? noteResult.note : null,
      });
    }
  }

  return changeNote;
}

/**
 * Find withdrawal input notes and change note.
 * Handles same-chain, cross-chain, and Withdraw2.
 */
export function findWithdrawalNotes(
  activity: ActivityItem,
  isCrossChain: boolean,
  timeline: ActivityTimelineEvent[] | undefined,
  newCommitment: string | null,
  allTrees: NoteTree[]
): WithdrawalNotes {
  const inputNotes: InputNote[] = [];
  let changeNote: Note | null = null;

  // Try to find change note by transaction hash (same-chain)
  let changeResult = findChangeNoteByTxHash(activity.txHash, allTrees);
  if (changeResult && isNote(changeResult.note)) {
    changeNote = addInputNotesFromChangeNode(changeResult, inputNotes, allTrees);
    if (inputNotes.length > 0) {
      return { inputNotes, changeNote };
    }
  }

  // Fallback: try to find change note via newCommitment
  if (!changeNote && newCommitment) {
    const commitmentResult = findNoteByCommitment(newCommitment, allTrees);
    if (
      commitmentResult &&
      isNote(commitmentResult.note) &&
      commitmentResult.note.noteType === "change"
    ) {
      changeNote = addInputNotesFromChangeNode(commitmentResult, inputNotes, allTrees);
      if (inputNotes.length > 0) {
        return { inputNotes, changeNote };
      }
    }
  }

  // For cross-chain, find via intent in timeline
  if (isCrossChain && timeline && timeline.length > 0) {
    const intentEvent = timeline.find((e) => e.activity.type.includes("INTENT"));
    if (intentEvent) {
      // Try finding change note by intent's txHash
      changeResult = findChangeNoteByTxHash(intentEvent.activity.txHash, allTrees);
      if (changeResult && isNote(changeResult.note)) {
        changeNote = addInputNotesFromChangeNode(changeResult, inputNotes, allTrees);
        if (inputNotes.length > 0) {
          return { inputNotes, changeNote };
        }
      }

      // Fallback: try WithdrawalIntent lookup
      const intentResult = findWithdrawalIntentByTxHash(intentEvent.activity.txHash, allTrees);
      if (intentResult) {
        const parentNote = intentResult.node.parent?.note;
        if (parentNote && isNote(parentNote)) {
          inputNotes.push({
            serialNumber: parentNote.serialNumber,
            amount: getNoteDisplayAmount(parentNote),
            note: parentNote,
          });
        }
        // Find change note as sibling
        if (!changeNote && intentResult.node.parent) {
          for (const sibling of intentResult.node.parent.children) {
            if (isNote(sibling.note) && sibling.note.noteType === "change") {
              changeNote = sibling.note;
              break;
            }
          }
        }
        if (inputNotes.length > 0) {
          return { inputNotes, changeNote };
        }
      }

      // Fallback: try spentNullifiers from intent
      const intentActivity = intentEvent.activity;
      const spentNullifiers =
        "spentNullifiers" in intentActivity ? intentActivity.spentNullifiers : null;
      if (spentNullifiers && spentNullifiers.length > 0) {
        const sourceResult = findNoteBySpentNullifier(spentNullifiers[0], allTrees);
        if (sourceResult && isNote(sourceResult.note)) {
          inputNotes.push({
            serialNumber: sourceResult.note.serialNumber,
            amount: getNoteDisplayAmount(sourceResult.note),
            note: sourceResult.note,
          });
          // Find change note in children
          if (!changeNote) {
            for (const child of sourceResult.node.children) {
              if (isNote(child.note) && child.note.noteType === "change") {
                changeNote = child.note;
                break;
              }
            }
          }
        }
      }
    }
  }

  // Final fallback: try spentNullifiers from main activity
  if (inputNotes.length === 0) {
    const spentNullifiers = "spentNullifiers" in activity ? activity.spentNullifiers : null;
    if (spentNullifiers && spentNullifiers.length > 0) {
      const sourceResult = findNoteBySpentNullifier(spentNullifiers[0], allTrees);
      if (sourceResult && isNote(sourceResult.note)) {
        inputNotes.push({
          serialNumber: sourceResult.note.serialNumber,
          amount: getNoteDisplayAmount(sourceResult.note),
          note: sourceResult.note,
        });
        if (!changeNote) {
          for (const child of sourceResult.node.children) {
            if (isNote(child.note) && child.note.noteType === "change") {
              changeNote = child.note;
              break;
            }
          }
        }
      }
    }
  }

  return { inputNotes, changeNote };
}

/**
 * Get newCommitment, checking timeline for cross-chain.
 */
export function getNewCommitment(
  activity: ActivityItem,
  isCrossChain: boolean,
  timeline?: ActivityTimelineEvent[]
): string | null {
  let newCommitment = "newCommitment" in activity ? activity.newCommitment : null;
  if (!newCommitment && isCrossChain && timeline) {
    const intentEvent = timeline.find((e) => e.activity.type.includes("INTENT"));
    if (intentEvent && "newCommitment" in intentEvent.activity) {
      newCommitment = intentEvent.activity.newCommitment;
    }
  }
  return newCommitment ?? null;
}

/**
 * Get refund commitment from activity or timeline.
 */
export function getRefundCommitment(
  activity: ActivityItem,
  timeline?: ActivityTimelineEvent[]
): string | null {
  const refundCommit = "refundCommitment" in activity ? activity.refundCommitment : null;
  if (refundCommit) return refundCommit;

  if (timeline) {
    const intentWithRefund = timeline.find((e) => "refundCommitment" in e.activity)?.activity;
    if (intentWithRefund && "refundCommitment" in intentWithRefund) {
      return intentWithRefund.refundCommitment ?? null;
    }
  }

  return null;
}
