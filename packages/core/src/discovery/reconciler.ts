/**
 * @shinobi-cash/core/discovery
 * Phase 3: Reconciliation
 * Updates existing notes with fresh activity data (ASP status, labels, etc.)
 */

import type { Activity } from '@shinobi-cash/data';
import {
  isCrossChainDepositActivity,
  isCrossChainWithdrawalActivity,
  isCrossChainWithdraw2Activity,
} from '@shinobi-cash/data';
import type {
  NoteTree,
  NoteNode,
  DepositNote,
  DepositIntentNote,
  WithdrawalIntentNote,
  ChainKey,
  Note,
} from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import { isDepositActivity } from './activity-indexer.js';
import {
  createWithdrawalRefundedNote,
  createCrosschainDepositNote,
  createCrosschainWithdrawalNote,
  createDepositRefundedNote,
} from './note-factory.js';
import { traverseTree, addChild, markTerminal } from './tree-utils.js';
import { isTerminalNote, isSpendableNote } from './types.js';

// ============================================================================
// Reconciler
// ============================================================================

/** Result of reconciliation with new nullifier entries */
export interface ReconcileResult {
  /**
   * Deposit indices that became active (filled deposit intents).
   * Caller should compute nullifier hashes using accountKey and add to nullifier map.
   */
  filledDepositIndices: Array<{ depositIndex: number; poolAddress: string; originChainId: string }>;
  /** Raw activities that matched during reconciliation (filled/refunded intents) */
  matchedActivities: Activity[];
}

/**
 * Reconcile existing trees with fresh activity data
 *
 * Updates:
 * - ASP status (pending -> approved/rejected)
 * - Labels (assigned by ASP)
 *
 * Also reconciles intent notes via activity index.
 *
 * @returns New nullifier entries from filled deposit intents
 */
export function reconcileTrees(
  trees: Map<ChainKey, NoteTree>,
  activities: Activity[],
  activityIndex?: ActivityIndex,
): ReconcileResult {
  const result: ReconcileResult = {
    filledDepositIndices: [],
    matchedActivities: [],
  };

  // Build lookup for deposit activities by precommitmentHash
  const depositActivityMap = new Map<string, Activity>();
  for (const activity of activities) {
    if (isDepositActivity(activity) && activity.precommitmentHash) {
      depositActivityMap.set(activity.precommitmentHash, activity);
    }
  }

  // Update each tree with fresh data
  for (const [, tree] of trees) {
    const rootNote = tree.root.note;

    // Handle trees starting with DepositNote
    if (rootNote.noteType === 'deposit') {
      const depositNote = rootNote as DepositNote;
      const fresh = depositActivityMap.get(depositNote.precommitmentHash);
      if (!fresh) continue;

      // Check if update is needed
      const aspChanged = depositNote.aspStatus !== fresh.aspStatus;
      const labelChanged = fresh.label && depositNote.label !== fresh.label?.toString();

      if (!aspChanged && !labelChanged) {
        continue;
      }

      // Update all spendable notes in the tree
      traverseTree(tree, (node) => {
        const note = node.note;

        // ASP status and label only propagate to spendable notes
        if (isSpendableNote(note)) {
          if (aspChanged) {
            note.aspStatus = fresh.aspStatus;
          }
          if (labelChanged && fresh.label) {
            note.label = fresh.label.toString();
          }
        }
      });
    }
    // Note: Intent notes are handled in reconcileIntentNotes
  }

  // Reconcile intent notes with fresh activity data
  if (activityIndex) {
    const intentResult = reconcileIntentNotes(trees, activityIndex);
    result.filledDepositIndices.push(...intentResult.filledDepositIndices);
    result.matchedActivities.push(...intentResult.matchedActivities);
  }

  return result;
}

/**
 * Reconcile intent notes with updated intent status from activities
 *
 * For WithdrawalIntentNote:
 * - filled: Create CrosschainWithdrawalNote child (terminal)
 * - refunded: Create WithdrawalRefundedNote child (spendable)
 *
 * For DepositIntentNote:
 * - filled: Create CrosschainDepositNote child (spendable)
 * - refunded: Create DepositRefundedNote child (terminal)
 */
function reconcileIntentNotes(
  trees: Map<ChainKey, NoteTree>,
  activityIndex: ActivityIndex,
): ReconcileResult {
  const result: ReconcileResult = {
    filledDepositIndices: [],
    matchedActivities: [],
  };

  // Track which activities we've added (for deduplication)
  const addedActivityIds = new Set<string>();

  for (const [, tree] of trees) {
    // Collect nodes to add children to after traversal
    const childrenToAdd: Array<{ parent: NoteNode; child: Note }> = [];

    traverseTree(tree, (node) => {
      const note = node.note;

      // Handle withdrawal intent notes
      if (note.noteType === 'withdrawalIntent') {
        const withdrawalIntent = note as WithdrawalIntentNote;
        if (!withdrawalIntent.orderId) return;

        const activity = activityIndex.withdrawalsByOrderId.get(withdrawalIntent.orderId);
        if (activity) {
          const wasReconciled = reconcileWithdrawalIntent(withdrawalIntent, activity, node, childrenToAdd);
          // Only add activity if it was actually reconciled (not already resolved)
          if (wasReconciled && !addedActivityIds.has(activity.id)) {
            result.matchedActivities.push(activity);
            addedActivityIds.add(activity.id);
          }
        }
      }
      // Handle deposit intent notes
      else if (note.noteType === 'depositIntent') {
        const depositIntent = note as DepositIntentNote;
        if (!depositIntent.orderId) return;

        const activity = activityIndex.depositsByOrderId.get(depositIntent.orderId);
        if (activity) {
          const wasReconciled = reconcileDepositIntent(depositIntent, activity, node, childrenToAdd, result);
          // Only add activity if it was actually reconciled (not already resolved)
          if (wasReconciled && !addedActivityIds.has(activity.id)) {
            result.matchedActivities.push(activity);
            addedActivityIds.add(activity.id);
          }
        }
      }
    });

    // Add children to their parents and mark as terminal if needed
    for (const { parent, child } of childrenToAdd) {
      const childNode = addChild(parent, child);
      if (isTerminalNote(child)) {
        markTerminal(childNode);
      }
    }
  }

  return result;
}

/**
 * Reconcile a WithdrawalIntentNote
 *
 * When filled: Create CrosschainWithdrawalNote as child (terminal)
 * When refunded: Create WithdrawalRefundedNote as child (spendable)
 *
 * @returns true if reconciliation was performed, false if already resolved
 */
function reconcileWithdrawalIntent(
  withdrawalIntent: WithdrawalIntentNote,
  activity: Activity,
  node: NoteNode,
  childrenToAdd: Array<{ parent: NoteNode; child: Note }>,
): boolean {
  // Check if already resolved by looking for children
  if (node.children.length > 0) return false;

  if (activity.intentStatus === 'filled') {
    // Solver filled - create CrosschainWithdrawalNote
    // Use type guards to verify activity type
    if (isCrossChainWithdrawalActivity(activity) || isCrossChainWithdraw2Activity(activity)) {
      const withdrawalRecord = createCrosschainWithdrawalNote(
        withdrawalIntent,
        activity,
        withdrawalIntent.changeIndex,
      );
      childrenToAdd.push({ parent: node, child: withdrawalRecord });
      return true;
    }
  } else if (activity.intentStatus === 'refunded') {
    // Refund executed - create WithdrawalRefundedNote (spendable)
    // Get label and aspStatus from parent (the spendable note that was spent)
    const parentNote = node.parent?.note;
    const label = parentNote && isSpendableNote(parentNote) ? parentNote.label : '';
    const aspStatus = parentNote && isSpendableNote(parentNote) ? parentNote.aspStatus : 'pending';
    const refundNote = createWithdrawalRefundedNote(withdrawalIntent, label, aspStatus);
    childrenToAdd.push({ parent: node, child: refundNote });
    return true;
  }

  return false;
}

/**
 * Reconcile a DepositIntentNote
 *
 * When filled: Create CrosschainDepositNote as child (spendable)
 * When refunded: Create DepositRefundedNote as child (terminal)
 *
 * @returns true if reconciliation was performed, false if already resolved
 */
function reconcileDepositIntent(
  depositIntent: DepositIntentNote,
  activity: Activity,
  node: NoteNode,
  childrenToAdd: Array<{ parent: NoteNode; child: Note }>,
  result: ReconcileResult,
): boolean {
  // Check if already resolved by looking for children
  if (node.children.length > 0) return false;

  if (activity.intentStatus === 'filled') {
    // Deposit filled - create CrosschainDepositNote
    // Use type guard to verify activity type
    if (isCrossChainDepositActivity(activity)) {
      const depositNote = createCrosschainDepositNote(
        activity,
        depositIntent.depositIndex,
        depositIntent.poolAddress,
        depositIntent.discoveredAtOffset,
      );
      childrenToAdd.push({ parent: node, child: depositNote });

      // Signal to caller that this deposit is now active
      result.filledDepositIndices.push({
        depositIndex: depositIntent.depositIndex,
        poolAddress: depositIntent.poolAddress,
        originChainId: depositIntent.originChainId,
      });
      return true;
    }
  } else if (activity.intentStatus === 'refunded') {
    // Deposit refunded - create DepositRefundedNote (terminal)
    const refundedNote = createDepositRefundedNote(depositIntent);
    childrenToAdd.push({ parent: node, child: refundedNote });
    return true;
  }

  return false;
}
