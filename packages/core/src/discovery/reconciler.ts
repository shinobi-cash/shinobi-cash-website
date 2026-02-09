/**
 * @shinobi-cash/core/discovery
 * Phase 3: Reconciliation
 * Updates existing notes with fresh activity data (ASP status, labels, etc.)
 */

import type { Activity } from '@shinobi-cash/data';
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
import { createRefundNote, createDepositNote } from './note-factory.js';
import { traverseTree, addChild, findNode } from './tree-utils.js';

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
}

/**
 * Reconcile existing trees with fresh activity data
 *
 * Updates:
 * - ASP status (pending -> approved/rejected)
 * - Intent status (pending -> filled/refunded)
 * - Labels (assigned by ASP)
 * - DepositIntentNote and WithdrawalIntentNote status (from activity index)
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
      const intentChanged = depositNote.intentStatus !== fresh.intentStatus;
      const labelChanged = fresh.label && depositNote.label !== fresh.label?.toString();

      if (!aspChanged && !intentChanged && !labelChanged) {
        continue;
      }

      // Update all notes in the tree
      traverseTree(tree, (node) => {
        const note = node.note;

        // ASP status propagates to all notes
        if (aspChanged) {
          note.aspStatus = fresh.aspStatus;
        }

        // Intent status and label only on deposit note
        if (note === depositNote) {
          if (intentChanged && fresh.intentStatus) {
            note.intentStatus = fresh.intentStatus;
          }
          if (labelChanged && fresh.label) {
            note.label = fresh.label.toString();
          }
        } else if (labelChanged && fresh.label) {
          // Label propagates to change notes too (inherited from deposit)
          note.label = fresh.label.toString();
        }
      });
    }
    // Note: Intent notes are handled in reconcileIntentNotes
  }

  // Reconcile intent notes with fresh activity data
  if (activityIndex) {
    const intentResult = reconcileIntentNotes(trees, activityIndex);
    // Merge filled deposit indices
    result.filledDepositIndices.push(...intentResult.filledDepositIndices);
  }

  return result;
}

/**
 * Reconcile intent notes with updated intent status from activities
 *
 * For WithdrawalIntentNote (orderId in withdrawalsByOrderId):
 * - intentStatus='filled': Mark as spent (funds delivered to recipient)
 * - intentStatus='refunded': Create RefundNote (spendable funds returned to pool)
 *
 * For DepositIntentNote (orderId in depositsByOrderId):
 * - intentStatus='filled': Create DepositNote (commitment now in pool)
 * - intentStatus='refunded': Mark as spent (funds returned to origin chain)
 */
function reconcileIntentNotes(
  trees: Map<ChainKey, NoteTree>,
  activityIndex: ActivityIndex,
): ReconcileResult {
  const result: ReconcileResult = {
    filledDepositIndices: [],
  };

  for (const [, tree] of trees) {
    // Collect nodes to add children to after traversal
    const childrenToAdd: Array<{ parent: NoteNode; child: Note }> = [];

    traverseTree(tree, (node) => {
      const note = node.note;

      // Handle withdrawal intent notes
      if (note.noteType === 'withdrawalIntent') {
        const withdrawalIntent = note as WithdrawalIntentNote;
        if (!withdrawalIntent.orderId) return;

        const withdrawalActivity = activityIndex.withdrawalsByOrderId.get(withdrawalIntent.orderId);
        if (withdrawalActivity) {
          reconcileWithdrawalIntent(withdrawalIntent, withdrawalActivity, node, tree, childrenToAdd);
        }
      }
      // Handle deposit intent notes
      else if (note.noteType === 'depositIntent') {
        const depositIntent = note as DepositIntentNote;
        if (!depositIntent.orderId) return;

        const depositActivity = activityIndex.depositsByOrderId.get(depositIntent.orderId);
        if (depositActivity) {
          reconcileDepositIntent(depositIntent, depositActivity, node, tree, childrenToAdd, result);
        }
      }
    });

    // Add children to their parents
    for (const { parent, child } of childrenToAdd) {
      addChild(parent, child);
    }
  }

  return result;
}

/**
 * Reconcile a WithdrawalIntentNote
 */
function reconcileWithdrawalIntent(
  withdrawalIntent: WithdrawalIntentNote,
  activity: Activity,
  node: NoteNode,
  tree: NoteTree,
  childrenToAdd: Array<{ parent: NoteNode; child: Note }>,
): void {
  // Skip if status hasn't changed
  if (withdrawalIntent.intentStatus === activity.intentStatus) return;

  if (activity.intentStatus === 'filled') {
    // Solver filled - funds delivered to recipient
    withdrawalIntent.intentStatus = 'filled';
    withdrawalIntent.status = 'spent';
    // Update with fill transaction from destination chain
    if (activity.destinationTransactionHash) {
      withdrawalIntent.destinationTransactionHash = activity.destinationTransactionHash;
    }
  } else if (activity.intentStatus === 'refunded') {
    // Refund executed - create RefundNote for spendable funds
    withdrawalIntent.intentStatus = 'refunded';
    withdrawalIntent.status = 'spent';

    // Idempotency guard: check if RefundNote already exists as child
    const existingRefund = findNode(
      tree,
      (n) =>
        n.note.noteType === 'refund' &&
        n.note.depositIndex === withdrawalIntent.depositIndex &&
        n.note.changeIndex === withdrawalIntent.parentChangeIndex &&
        n.note.orderId === withdrawalIntent.orderId,
    );

    if (!existingRefund) {
      const refundNote = createRefundNote(withdrawalIntent);
      childrenToAdd.push({ parent: node, child: refundNote });
    }
  }
}

/**
 * Reconcile a DepositIntentNote
 */
function reconcileDepositIntent(
  depositIntent: DepositIntentNote,
  activity: Activity,
  node: NoteNode,
  tree: NoteTree,
  childrenToAdd: Array<{ parent: NoteNode; child: Note }>,
  result: ReconcileResult,
): void {
  // Skip if status hasn't changed
  if (depositIntent.intentStatus === activity.intentStatus) return;

  if (activity.intentStatus === 'filled') {
    // Deposit filled - commitment is now in pool, create DepositNote
    depositIntent.intentStatus = 'filled';
    depositIntent.status = 'spent';

    // Idempotency guard: check if DepositNote already exists as child
    const existingDeposit = findNode(
      tree,
      (n) =>
        n.note.noteType === 'deposit' &&
        n.note.depositIndex === depositIntent.depositIndex,
    );

    if (!existingDeposit) {
      const depositNote = createDepositNote(
        activity,
        depositIntent.depositIndex,
        depositIntent.poolAddress,
        depositIntent.discoveredAtOffset,
      );
      childrenToAdd.push({ parent: node, child: depositNote });

      // Signal to caller that this deposit is now active
      // Caller should compute nullifier hash using accountKey
      result.filledDepositIndices.push({
        depositIndex: depositIntent.depositIndex,
        poolAddress: depositIntent.poolAddress,
        originChainId: depositIntent.originChainId,
      });
    }
  } else if (activity.intentStatus === 'refunded') {
    // Deposit refunded - funds returned to origin chain, no pool action needed
    depositIntent.intentStatus = 'refunded';
    depositIntent.status = 'spent';
    // No RefundNote - funds went back to user's wallet on origin chain
  }
}
