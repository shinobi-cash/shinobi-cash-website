/**
 * @shinobi-cash/core/discovery
 * Phase 2: Tree Extension
 *
 * Extends note trees with withdrawals (both 1:1 and 2:1 Withdraw2)
 *
 * Architecture: Plan / Apply Split
 * - Planning: Pure, read-only computation of what extensions to apply
 * - Applying: Mechanical mutation based on the plan
 *
 * This separation ensures:
 * - Deterministic behavior (same inputs = same outputs)
 * - Replay safety (plans can be recomputed)
 * - Easier testing (plan and apply can be tested independently)
 */

import type { NoteTree, NullifierInfo } from './types.js';
import type { ChainKey } from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import {
  createChangeNote,
  createWithdraw2ChangeNote,
  createMergedNote,
  createWithdrawalIntentNote,
} from './note-factory.js';
import {
  planTreeExtensions,
  type PlannedExtension,
  type Planned1x1Extension,
  type PlannedWithdraw2Extension,
  type PlannedRagequitExtension,
} from './chain-extension-planner.js';
import { findNodeByPosition, addChild, getSpendableLeaves, markTerminal } from './tree-utils.js';

// ============================================================================
// Extension Result Type
// ============================================================================

export interface ExtensionResult {
  /** Updated trees after extension (keyed by ChainKey) */
  updatedTrees: Map<ChainKey, NoteTree>;
  /** Updated nullifier map after extension */
  updatedNullifierMap: Map<string, NullifierInfo>;
}

// ============================================================================
// Tree Extender (Orchestrator)
// ============================================================================

/**
 * Extend all trees with withdrawals from the current activity page
 *
 * Uses Plan/Apply pattern:
 * 1. Plan all extensions (pure, read-only)
 * 2. Apply all extensions (mechanical mutation)
 */
export function extendAllTrees(
  trees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>,
  activityIndex: ActivityIndex,
  accountKey: bigint,
  poolAddress: string,
): ExtensionResult {
  const updatedTrees = new Map(trees);
  const updatedNullifierMap = new Map(nullifierMap);

  // Track processed Withdraw2s to avoid double-processing
  const processedWithdraw2s = new Set<string>();

  // Collect all plans first (PLANNING PHASE - read-only)
  const allPlans: Array<{ chainKey: ChainKey; plans: PlannedExtension[] }> = [];

  for (const [chainKey, tree] of updatedTrees) {
    const plans = planTreeExtensions(
      tree,
      chainKey,
      updatedTrees,
      updatedNullifierMap,
      activityIndex,
      accountKey,
      poolAddress,
    );
    if (plans.length > 0) {
      allPlans.push({ chainKey, plans });
    }
  }

  // Apply all plans (APPLICATION PHASE - mutation)
  for (const { plans } of allPlans) {
    for (const plan of plans) {
      applyExtension(
        plan,
        updatedTrees,
        updatedNullifierMap,
        processedWithdraw2s,
      );
    }
  }

  return { updatedTrees, updatedNullifierMap };
}

// ============================================================================
// Extension Application (Mutation)
// ============================================================================

/**
 * Apply a single planned extension
 * This function ONLY mutates - all decisions were made in planning
 */
function applyExtension(
  plan: PlannedExtension,
  trees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>,
  processedWithdraw2s: Set<string>,
): void {
  switch (plan.kind) {
    case 'withdraw1x1':
      apply1x1Withdrawal(plan, trees, nullifierMap);
      break;
    case 'withdraw2':
      applyWithdraw2(plan, trees, nullifierMap, processedWithdraw2s);
      break;
    case 'ragequit':
      applyRagequit(plan, trees, nullifierMap);
      break;
  }
}

/**
 * Apply a 1:1 withdrawal extension
 */
function apply1x1Withdrawal(
  plan: Planned1x1Extension,
  trees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>,
): void {
  const tree = trees.get(plan.chainKey);
  if (!tree) return;

  // Find the node to extend by position
  const nodeToExtend = findNodeByPosition(tree, plan.depositIndex, plan.parentChangeIndex);
  if (!nodeToExtend) return;

  // Mark current note as spent
  nodeToExtend.note.status = 'spent';

  // Create change note as child
  const changeNote = createChangeNote(nodeToExtend.note, plan.activity, plan.newChangeIndex, plan.remaining);
  addChild(nodeToExtend, changeNote);

  // Create WithdrawalIntentNote if needed (for cross-chain withdrawals)
  // This is added as a SIBLING of the change note (same parent)
  if (plan.createPendingIntent) {
    const withdrawalIntent = createWithdrawalIntentNote(nodeToExtend.note, plan.activity, plan.parentChangeIndex);
    addChild(nodeToExtend, withdrawalIntent);
  }

  // Update nullifier map - ALWAYS insert before delete for crash safety
  // If app crashes between operations, insert-first ensures we don't lose the nullifier
  if (plan.newNullifierHash) {
    nullifierMap.set(plan.newNullifierHash, {
      originChainId: plan.originChainId,
      depositIndex: plan.depositIndex,
      changeIndex: plan.newChangeIndex,
    });
  }
  nullifierMap.delete(plan.oldNullifierHash);
}

/**
 * Apply a Withdraw2 extension
 */
function applyWithdraw2(
  plan: PlannedWithdraw2Extension,
  trees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>,
  processedWithdraw2s: Set<string>,
): void {
  // Generate a unique key for this Withdraw2 to avoid double-processing.
  // Use nullifier hashes (unique per chain position) for a robust key.
  const withdraw2Key = `${plan.activity.originTransactionHash}-${plan.primaryOldNullifierHash}-${plan.secondaryOldNullifierHash}`;
  if (processedWithdraw2s.has(withdraw2Key)) {
    return;
  }
  processedWithdraw2s.add(withdraw2Key);

  const primaryTree = trees.get(plan.primaryChainKey);
  const secondaryTree = trees.get(plan.secondaryChainKey);

  if (!primaryTree || !secondaryTree) return;

  // Find nodes to extend by position
  const primaryNode = findNodeByPosition(primaryTree, plan.primaryDepositIndex, plan.primaryParentChangeIndex);
  const secondaryNode = findNodeByPosition(secondaryTree, plan.secondaryDepositIndex, plan.secondaryChangeIndex);

  if (!primaryNode || !secondaryNode) return;

  // Mark both notes as spent
  primaryNode.note.status = 'spent';
  secondaryNode.note.status = 'spent';

  // Create change note on primary tree as child
  const changeNote = createWithdraw2ChangeNote(
    primaryNode.note,
    plan.activity,
    plan.primaryNewChangeIndex,
    plan.remaining,
    plan.secondaryDepositIndex,
    secondaryNode.note.originChainId,
    BigInt(secondaryNode.note.amount), // mergedFromAmount
  );
  addChild(primaryNode, changeNote);

  // Create WithdrawalIntentNote if needed (for cross-chain Withdraw2)
  // This is added as a SIBLING of the change note (same parent)
  if (plan.createPendingIntent) {
    const withdrawalIntent = createWithdrawalIntentNote(
      primaryNode.note,
      plan.activity,
      plan.primaryParentChangeIndex,
    );
    addChild(primaryNode, withdrawalIntent);
  }

  // Create merged note on secondary tree as child
  const mergedNote = createMergedNote(
    secondaryNode.note,
    plan.activity,
    plan.secondaryNewChangeIndex,
    plan.primaryDepositIndex,
    primaryNode.note.originChainId,
  );
  const mergedChild = addChild(secondaryNode, mergedNote);
  // Mark merged node as terminal (no children allowed)
  markTerminal(mergedChild);

  // Update nullifier map - ALWAYS insert before delete for crash safety
  if (plan.primaryNewNullifierHash) {
    nullifierMap.set(plan.primaryNewNullifierHash, {
      originChainId: plan.primaryOriginChainId,
      depositIndex: plan.primaryDepositIndex,
      changeIndex: plan.primaryNewChangeIndex,
    });
  }
  nullifierMap.delete(plan.primaryOldNullifierHash);
  nullifierMap.delete(plan.secondaryOldNullifierHash);
}

/**
 * Apply a ragequit extension
 */
function applyRagequit(
  plan: PlannedRagequitExtension,
  trees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>,
): void {
  const tree = trees.get(plan.chainKey);
  if (!tree) return;

  // Find the node by position
  const node = findNodeByPosition(tree, plan.depositIndex, plan.changeIndex);
  if (!node) return;

  // Mark note as spent with ragequit status
  node.note.status = 'ragequit';

  // Store ragequit activity data (including original amount for history display)
  node.note.activityData = {
    ...node.note.activityData,
    ragequitTxHash: plan.activity.originTransactionHash,
    ragequitTimestamp: plan.activity.timestamp.toString(),
    ragequitBlockNumber: plan.activity.blockNumber.toString(),
    ragequitUser: plan.activity.user,
    ragequitAmount: node.note.amount, // Store original amount before zeroing
  };

  // Set remaining balance to 0 (funds have been withdrawn)
  node.note.amount = '0';

  // Mark as terminal (no children allowed after ragequit)
  markTerminal(node);

  // Remove nullifier
  nullifierMap.delete(plan.nullifierHash);
}
