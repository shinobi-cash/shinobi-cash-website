/**
 * @shinobi-cash/core/discovery
 * Phase 3: Reconciliation
 * Updates existing notes with fresh activity data (ASP status, labels, etc.)
 */

import type {
  ActivityItem,
  CrosschainDepositFillActivity,
  CrosschainWithdrawalFillActivity,
} from "@shinobi-cash/data";
import { isCrosschainDepositFill, isCrosschainWithdrawalFill } from "@shinobi-cash/data";
import type {
  NoteTree,
  NoteNode,
  DepositNote,
  DepositIntentNote,
  WithdrawalIntentNote,
  ChangeNote,
  ChainKey,
  Note,
} from "./types.js";
import type { ActivityIndex } from "./activity-indexer.js";
import { isDepositActivity } from "./activity-indexer.js";
import {
  createWithdrawalRefundedNote,
  createCrosschainDepositNote,
  createCrosschainWithdrawalNote,
  createDepositRefundedNote,
} from "./note-factory.js";
import { traverseTree, addChild, markTerminal } from "./tree-utils.js";
import { isTerminalNote, isSpendableNote } from "./types.js";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Update ASP status and label on all spendable notes in a tree
 */
function updateTreeAspStatus(tree: NoteTree, fresh: ActivityItem): void {
  // Find any spendable note to compare current state
  let currentAspStatus: string | undefined;
  let currentLabel: string | undefined;

  traverseTree(tree, (node) => {
    if (isSpendableNote(node.note) && currentAspStatus === undefined) {
      currentAspStatus = node.note.aspStatus;
      currentLabel = node.note.label;
    }
  });

  // Get aspStatus and label from the fresh activity (only deposit types have these)
  const freshAspStatus = "aspStatus" in fresh ? fresh.aspStatus : undefined;
  const freshLabel = "label" in fresh ? fresh.label : undefined;

  // Check if update is needed
  const aspChanged = freshAspStatus && currentAspStatus !== freshAspStatus;
  const labelChanged = freshLabel && currentLabel !== freshLabel;

  if (!aspChanged && !labelChanged) {
    return;
  }

  // Update all spendable notes in the tree
  traverseTree(tree, (node) => {
    const note = node.note;

    // ASP status and label only propagate to spendable notes
    if (isSpendableNote(note)) {
      if (aspChanged && freshAspStatus) {
        note.aspStatus = freshAspStatus;
      }
      if (labelChanged && freshLabel) {
        note.label = freshLabel;
      }
    }
  });
}

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
  /** Raw activities that matched during reconciliation (filled/refunded intents + ASP updates) */
  matchedActivities: ActivityItem[];
}

/**
 * Reconcile existing trees with fresh activity data
 *
 * Updates:
 * - ASP status (pending -> approved)
 * - Labels (assigned by ASP)
 *
 * Also reconciles intent notes via activity index.
 *
 * @returns New nullifier entries from filled deposit intents
 */
export function reconcileTrees(
  trees: Map<ChainKey, NoteTree>,
  activities: ActivityItem[],
  activityIndex?: ActivityIndex
): ReconcileResult {
  const result: ReconcileResult = {
    filledDepositIndices: [],
    matchedActivities: [],
  };

  // Build lookup for deposit activities by precommitment
  const depositActivityMap = new Map<string, ActivityItem>();
  for (const activity of activities) {
    if (isDepositActivity(activity) && "precommitment" in activity && activity.precommitment) {
      depositActivityMap.set(activity.precommitment, activity);
    }
  }

  // Track which activities we've added (for deduplication)
  const addedActivityTxHashes = new Set<string>();

  // Update each tree with fresh data
  for (const [, tree] of trees) {
    const rootNote = tree.root.note;

    // Handle trees starting with DepositNote (same-chain deposits)
    if (rootNote.noteType === "deposit") {
      const depositNote = rootNote as DepositNote;
      const fresh = depositActivityMap.get(depositNote.precommitmentHash);
      if (fresh) {
        updateTreeAspStatus(tree, fresh);
        // Store updated activity for persistence
        if (!addedActivityTxHashes.has(fresh.txHash)) {
          result.matchedActivities.push(fresh);
          addedActivityTxHashes.add(fresh.txHash);
        }
      }
    }
    // Handle trees starting with DepositIntentNote (cross-chain deposits)
    else if (rootNote.noteType === "depositIntent") {
      // Find the filled deposit child (if any)
      const depositChild = tree.root.children.find(
        (child) => child.note.noteType === "crosschainDeposit" || child.note.noteType === "deposit"
      );
      if (depositChild && "precommitmentHash" in depositChild.note) {
        const fresh = depositActivityMap.get(depositChild.note.precommitmentHash as string);
        if (fresh) {
          updateTreeAspStatus(tree, fresh);
          // Store updated activity for persistence
          if (!addedActivityTxHashes.has(fresh.txHash)) {
            result.matchedActivities.push(fresh);
            addedActivityTxHashes.add(fresh.txHash);
          }
        }
      }
    }
    // Note: Intent notes are handled in reconcileIntentNotes
  }

  // Reconcile intent notes with fresh activity data
  if (activityIndex) {
    const intentResult = reconcileIntentNotes(trees, activityIndex, addedActivityTxHashes);
    result.filledDepositIndices.push(...intentResult.filledDepositIndices);
    result.matchedActivities.push(...intentResult.matchedActivities);
  }

  return result;
}

/**
 * Reconcile intent notes with updated status from separate FILL/REFUND activities
 *
 * For WithdrawalIntentNote:
 * - CROSSCHAIN_WITHDRAWAL_FILL found: Create CrosschainWithdrawalNote child (terminal)
 * - CROSSCHAIN_WITHDRAWAL_REFUND found: Create WithdrawalRefundedNote child (spendable)
 *
 * For DepositIntentNote:
 * - CROSSCHAIN_DEPOSIT_FILL found: Create CrosschainDepositNote child (spendable)
 * - CROSSCHAIN_DEPOSIT_REFUND found: Create DepositRefundedNote child (terminal)
 */
function reconcileIntentNotes(
  trees: Map<ChainKey, NoteTree>,
  activityIndex: ActivityIndex,
  addedActivityTxHashes: Set<string>
): ReconcileResult {
  const result: ReconcileResult = {
    filledDepositIndices: [],
    matchedActivities: [],
  };

  for (const [, tree] of trees) {
    // Collect nodes to add children to after traversal
    const childrenToAdd: Array<{ parent: NoteNode; child: Note }> = [];

    traverseTree(tree, (node) => {
      const note = node.note;

      // Handle withdrawal intent notes
      if (note.noteType === "withdrawalIntent") {
        const withdrawalIntent = note as WithdrawalIntentNote;
        if (!withdrawalIntent.orderId) return;

        // Check for fill activity
        const fillActivity = activityIndex.withdrawalFillsByOrderId.get(withdrawalIntent.orderId);
        if (fillActivity && isCrosschainWithdrawalFill(fillActivity)) {
          const wasReconciled = reconcileWithdrawalIntentWithFill(
            withdrawalIntent,
            fillActivity,
            node,
            childrenToAdd
          );
          if (wasReconciled && !addedActivityTxHashes.has(fillActivity.txHash)) {
            result.matchedActivities.push(fillActivity);
            addedActivityTxHashes.add(fillActivity.txHash);
          }
          return;
        }

        // Check for refund activity
        const refundActivity = activityIndex.withdrawalRefundsByOrderId.get(
          withdrawalIntent.orderId
        );
        if (refundActivity) {
          const wasReconciled = reconcileWithdrawalIntentWithRefund(
            withdrawalIntent,
            node,
            childrenToAdd
          );
          if (wasReconciled && !addedActivityTxHashes.has(refundActivity.txHash)) {
            result.matchedActivities.push(refundActivity);
            addedActivityTxHashes.add(refundActivity.txHash);
          }
        }
      }
      // Handle deposit intent notes
      else if (note.noteType === "depositIntent") {
        const depositIntent = note as DepositIntentNote;
        if (!depositIntent.orderId) return;

        // Check for fill activity
        const fillActivity = activityIndex.depositFillsByOrderId.get(depositIntent.orderId);
        if (fillActivity && isCrosschainDepositFill(fillActivity)) {
          const wasReconciled = reconcileDepositIntentWithFill(
            depositIntent,
            fillActivity,
            node,
            childrenToAdd,
            result
          );
          if (wasReconciled && !addedActivityTxHashes.has(fillActivity.txHash)) {
            result.matchedActivities.push(fillActivity);
            addedActivityTxHashes.add(fillActivity.txHash);
          }
          return;
        }

        // Check for refund activity
        const refundActivity = activityIndex.depositRefundsByOrderId.get(depositIntent.orderId);
        if (refundActivity) {
          const wasReconciled = reconcileDepositIntentWithRefund(
            depositIntent,
            node,
            childrenToAdd
          );
          if (wasReconciled && !addedActivityTxHashes.has(refundActivity.txHash)) {
            result.matchedActivities.push(refundActivity);
            addedActivityTxHashes.add(refundActivity.txHash);
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
 * Reconcile a WithdrawalIntentNote when a FILL activity is found
 *
 * Creates CrosschainWithdrawalNote as child (terminal)
 *
 * @returns true if reconciliation was performed, false if already resolved
 */
function reconcileWithdrawalIntentWithFill(
  withdrawalIntent: WithdrawalIntentNote,
  fillActivity: CrosschainWithdrawalFillActivity,
  node: NoteNode,
  childrenToAdd: Array<{ parent: NoteNode; child: Note }>
): boolean {
  // Check if already resolved by looking for children
  if (node.children.length > 0) return false;

  // For cross-chain withdraw2, extract mergedFrom from sibling ChangeNote
  let mergedFrom: Record<string, string> | undefined;
  if (withdrawalIntent.mergeType === "2:1" && node.parent) {
    const siblingChangeNote = node.parent.children.find(
      (sibling): sibling is NoteNode & { note: ChangeNote } =>
        sibling.note.noteType === "change" && Object.keys(sibling.note.mergedFrom).length > 0
    );
    if (siblingChangeNote) {
      mergedFrom = siblingChangeNote.note.mergedFrom;
    }
  }

  const withdrawalRecord = createCrosschainWithdrawalNote(
    withdrawalIntent,
    fillActivity,
    withdrawalIntent.changeIndex,
    mergedFrom
  );
  childrenToAdd.push({ parent: node, child: withdrawalRecord });

  return true;
}

/**
 * Reconcile a WithdrawalIntentNote when a REFUND activity is found
 *
 * Creates WithdrawalRefundedNote as child (spendable)
 *
 * @returns true if reconciliation was performed, false if already resolved
 */
function reconcileWithdrawalIntentWithRefund(
  withdrawalIntent: WithdrawalIntentNote,
  node: NoteNode,
  childrenToAdd: Array<{ parent: NoteNode; child: Note }>
): boolean {
  // Check if already resolved by looking for children
  if (node.children.length > 0) return false;

  // Get label and aspStatus from parent (the spendable note that was spent)
  const parentNote = node.parent?.note;
  const label = parentNote && isSpendableNote(parentNote) ? parentNote.label : "";
  const aspStatus = parentNote && isSpendableNote(parentNote) ? parentNote.aspStatus : "pending";
  const refundNote = createWithdrawalRefundedNote(withdrawalIntent, label, aspStatus);
  childrenToAdd.push({ parent: node, child: refundNote });

  return true;
}

/**
 * Reconcile a DepositIntentNote when a FILL activity is found
 *
 * Creates CrosschainDepositNote as child (spendable)
 *
 * @returns true if reconciliation was performed, false if already resolved
 */
function reconcileDepositIntentWithFill(
  depositIntent: DepositIntentNote,
  fillActivity: CrosschainDepositFillActivity,
  node: NoteNode,
  childrenToAdd: Array<{ parent: NoteNode; child: Note }>,
  result: ReconcileResult
): boolean {
  // Check if already resolved by looking for children
  if (node.children.length > 0) return false;

  const depositNote = createCrosschainDepositNote(
    fillActivity,
    depositIntent.depositIndex,
    depositIntent.poolAddress,
    depositIntent.discoveredAtOffset,
    depositIntent.originChainId
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

/**
 * Reconcile a DepositIntentNote when a REFUND activity is found
 *
 * Creates DepositRefundedNote as child (terminal)
 *
 * @returns true if reconciliation was performed, false if already resolved
 */
function reconcileDepositIntentWithRefund(
  depositIntent: DepositIntentNote,
  node: NoteNode,
  childrenToAdd: Array<{ parent: NoteNode; child: Note }>
): boolean {
  // Check if already resolved by looking for children
  if (node.children.length > 0) return false;

  const refundedNote = createDepositRefundedNote(depositIntent);
  childrenToAdd.push({ parent: node, child: refundedNote });

  return true;
}
