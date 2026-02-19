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

import type { ActivityItem, RagequitActivity } from "@shinobi-cash/data";
import type { NoteTree, NullifierInfo, SpendableNote } from "./types.js";
import type { ChainKey } from "./types.js";
import { isNote, isSpendableNote } from "./types.js";
import type { ActivityIndex } from "./activity-indexer.js";
import {
  isSameChainWithdrawal,
  isCrosschainWithdrawIntent,
  isSameChainWithdraw2,
  isCrosschainWithdraw2Intent,
} from "./activity-indexer.js";
import {
  createChangeNote,
  createWithdrawalNote,
  createWithdraw2ChangeNote,
  createMergedNote,
  createWithdrawalIntent,
  createCrosschainWithdrawalNote,
  createRagequitNote,
  type ChangeActivity,
  type Withdraw2MergeActivity,
} from "./note-factory.js";
import {
  planTreeExtensions,
  type PlannedExtension,
  type Planned1x1Extension,
  type PlannedWithdraw2Extension,
  type PlannedRagequitExtension,
} from "./chain-extension-planner.js";
import { findNodeByPosition, addChild, markTerminal } from "./tree-utils.js";

// ============================================================================
// Extension Result Type
// ============================================================================

export interface ExtensionResult {
  /** Updated trees after extension (keyed by ChainKey) */
  updatedTrees: Map<ChainKey, NoteTree>;
  /** Updated nullifier map after extension */
  updatedNullifierMap: Map<string, NullifierInfo>;
  /** Raw activities that matched user's withdrawals/ragequits */
  matchedActivities: ActivityItem[];
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
  poolAddress: string
): ExtensionResult {
  const updatedTrees = new Map(trees);
  const updatedNullifierMap = new Map(nullifierMap);
  const matchedActivities: ActivityItem[] = [];

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
      poolAddress
    );
    if (plans.length > 0) {
      allPlans.push({ chainKey, plans });
    }
  }

  // Track which activities we've already added (for Withdraw2 deduplication)
  const addedActivityTxHashes = new Set<string>();

  // Apply all plans (APPLICATION PHASE - mutation)
  for (const { plans } of allPlans) {
    for (const plan of plans) {
      applyExtension(plan, updatedTrees, updatedNullifierMap, processedWithdraw2s);

      // Collect the activity from each plan (deduplicate by txHash)
      if (!addedActivityTxHashes.has(plan.activity.txHash)) {
        matchedActivities.push(plan.activity);
        addedActivityTxHashes.add(plan.activity.txHash);
      }
    }
  }

  return { updatedTrees, updatedNullifierMap, matchedActivities };
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
  processedWithdraw2s: Set<string>
): void {
  switch (plan.kind) {
    case "withdraw1x1":
      apply1x1Withdrawal(plan, trees, nullifierMap);
      break;
    case "withdraw2":
      applyWithdraw2(plan, trees, nullifierMap, processedWithdraw2s);
      break;
    case "ragequit":
      applyRagequit(plan, trees, nullifierMap);
      break;
  }
}

/**
 * Apply a 1:1 withdrawal extension
 *
 * Creates siblings under the spent node:
 * - ChangeNote (remaining balance, spendable) - always created
 * - WithdrawalNote (same-chain) OR WithdrawalIntentNote (cross-chain intent)
 *
 * For cross-chain withdrawals:
 * - WithdrawalIntentNote is created (intent waiting for fill)
 * - Reconciler adds CrosschainWithdrawalNote when FILL activity found
 * - Reconciler adds WithdrawalRefundedNote when REFUND activity found
 */
function apply1x1Withdrawal(
  plan: Planned1x1Extension,
  trees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>
): void {
  const tree = trees.get(plan.chainKey);
  if (!tree) {
    return;
  }

  // Find the node to extend by position
  const nodeToExtend = findNodeByPosition(tree, plan.depositIndex, plan.parentChangeIndex);
  if (!nodeToExtend) {
    return;
  }

  // Verify the node contains a spendable note (not an intent)
  const parentNote = nodeToExtend.note;
  if (!isNote(parentNote) || !isSpendableNote(parentNote)) {
    return;
  }

  // Mark current note as spent
  parentNote.status = "spent";

  // Always create ChangeNote for remaining balance (spendable)
  const changeNote = createChangeNote(
    parentNote,
    plan.activity as ChangeActivity,
    plan.newChangeIndex,
    plan.remaining
  );
  addChild(nodeToExtend, changeNote);

  if (isCrosschainWithdrawIntent(plan.activity)) {
    const activity = plan.activity;
    // refundChangeIndex is same as newChangeIndex (sibling to ChangeNote)
    const withdrawalIntent = createWithdrawalIntent(
      parentNote,
      activity,
      plan.parentChangeIndex,
      plan.newChangeIndex // refundChangeIndex
    );
    addChild(nodeToExtend, withdrawalIntent);
  } else if (isSameChainWithdrawal(plan.activity)) {
    const activity = plan.activity;
    const withdrawalRecord = createWithdrawalNote(parentNote, activity, plan.parentChangeIndex);
    const recordNode = addChild(nodeToExtend, withdrawalRecord);
    markTerminal(recordNode);
  }

  // Update nullifier map (insert before delete for crash safety)
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
 *
 * Creates on primary tree:
 * - ChangeNote (remaining balance, spendable)
 * - WithdrawalNote (same-chain) OR WithdrawalIntentNote (cross-chain intent)
 *
 * Creates on secondary tree:
 * - MergedNote (terminal)
 *
 * For cross-chain withdrawals:
 * - WithdrawalIntentNote is created (intent waiting for fill)
 * - Reconciler adds CrosschainWithdrawalNote when FILL activity found
 * - Reconciler adds WithdrawalRefundedNote when REFUND activity found
 */
function applyWithdraw2(
  plan: PlannedWithdraw2Extension,
  trees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>,
  processedWithdraw2s: Set<string>
): void {
  // Generate a unique key for this Withdraw2 to avoid double-processing.
  // Use nullifier hashes (unique per chain position) for a robust key.
  const withdraw2Key = `${plan.activity.txHash}-${plan.primaryOldNullifierHash}-${plan.secondaryOldNullifierHash}`;
  if (processedWithdraw2s.has(withdraw2Key)) {
    return;
  }
  processedWithdraw2s.add(withdraw2Key);

  const primaryTree = trees.get(plan.primaryChainKey);
  const secondaryTree = trees.get(plan.secondaryChainKey);

  if (!primaryTree || !secondaryTree) {
    return;
  }

  // Find nodes to extend by position
  const primaryNode = findNodeByPosition(
    primaryTree,
    plan.primaryDepositIndex,
    plan.primaryParentChangeIndex
  );
  const secondaryNode = findNodeByPosition(
    secondaryTree,
    plan.secondaryDepositIndex,
    plan.secondaryChangeIndex
  );

  if (!primaryNode || !secondaryNode) {
    return;
  }

  // Verify both nodes contain spendable notes (not intents)
  const primaryNote = primaryNode.note;
  const secondaryNote = secondaryNode.note;
  if (
    !isNote(primaryNote) ||
    !isSpendableNote(primaryNote) ||
    !isNote(secondaryNote) ||
    !isSpendableNote(secondaryNote)
  ) {
    return;
  }

  // Mark both notes as spent
  primaryNote.status = "spent";
  secondaryNote.status = "spent";

  // Create change note on primary tree (spendable remaining balance)
  const changeNote = createWithdraw2ChangeNote(
    primaryNote,
    plan.activity as Withdraw2MergeActivity,
    plan.primaryNewChangeIndex,
    plan.remaining,
    secondaryNote.serialNumber,
    BigInt(secondaryNote.amount)
  );
  addChild(primaryNode, changeNote);

  if (isCrosschainWithdraw2Intent(plan.activity)) {
    const activity = plan.activity;
    // refundChangeIndex is same as newChangeIndex (sibling to ChangeNote)
    const withdrawalIntent = createWithdrawalIntent(
      primaryNote,
      activity,
      plan.primaryParentChangeIndex,
      plan.primaryNewChangeIndex // refundChangeIndex
    );
    addChild(primaryNode, withdrawalIntent);
  } else if (isSameChainWithdraw2(plan.activity)) {
    const activity = plan.activity;
    const withdrawalRecord = createWithdrawalNote(
      primaryNote,
      activity,
      plan.primaryParentChangeIndex
    );
    const recordNode = addChild(primaryNode, withdrawalRecord);
    markTerminal(recordNode);
  }

  const mergedNote = createMergedNote(
    secondaryNote,
    plan.activity as Withdraw2MergeActivity,
    primaryNote.serialNumber
  );
  const mergedChild = addChild(secondaryNode, mergedNote);
  markTerminal(mergedChild);

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
 *
 * Creates RagequitNote as child of the spent parent note.
 */
function applyRagequit(
  plan: PlannedRagequitExtension,
  trees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>
): void {
  const tree = trees.get(plan.chainKey);
  if (!tree) return;

  // Find the node by position
  const node = findNodeByPosition(tree, plan.depositIndex, plan.changeIndex);
  if (!node) return;

  // Verify the node contains a spendable note (not an intent)
  const note = node.note;
  if (!isNote(note) || !isSpendableNote(note)) return;

  // Mark parent note as spent
  note.status = "spent";

  // Create RagequitNote as child (terminal record of public withdrawal)
  const ragequitNote = createRagequitNote(note, plan.activity as RagequitActivity);
  const ragequitNode = addChild(node, ragequitNote);
  markTerminal(ragequitNode);

  // Remove nullifier
  nullifierMap.delete(plan.nullifierHash);
}
