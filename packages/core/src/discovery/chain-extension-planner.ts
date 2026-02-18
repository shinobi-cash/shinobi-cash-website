/**
 * @shinobi-cash/core/discovery
 * Phase 2: Tree Extension Planning (Read-Only)
 *
 * Pure planning layer for tree extensions.
 * All functions in this file are read-only - no mutations allowed.
 */

import type {
  ActivityItem,
  WithdrawActivity,
  Withdraw2Activity,
  CrosschainWithdrawIntentActivity,
  CrosschainWithdraw2IntentActivity,
} from '@shinobi-cash/data';
import type { NoteTree, NullifierInfo, ChainKey } from './types.js';
import { makeChainKey, isSpendableNote } from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import {
  isSameChainWithdrawal,
  isCrosschainWithdrawIntent,
  isSameChainWithdraw2,
  isCrosschainWithdraw2Intent,
} from './activity-indexer.js';
import { deriveAndHashNullifier } from './nullifier-utils.js';
import { derivedNoteCommitment } from '../withdrawal/index.js';
import { getLastSpendableLeaf } from './tree-utils.js';

// ============================================================================
// Planned Extension Types
// ============================================================================

/**
 * A planned 1:1 withdrawal extension
 * All values computed, ready to apply
 */
export interface Planned1x1Extension {
  kind: 'withdraw1x1';
  chainKey: ChainKey;
  originChainId: string;
  depositIndex: number;
  parentChangeIndex: number;
  newChangeIndex: number;
  activity: ActivityItem;
  withdrawn: bigint;
  remaining: bigint;
  oldNullifierHash: string;
  newNullifierHash: string | null; // null if remaining is 0
  createPendingIntent: boolean;
}

/**
 * A planned 2:1 Withdraw2 extension
 * Represents the merge of two chains
 */
export interface PlannedWithdraw2Extension {
  kind: 'withdraw2';
  primaryChainKey: ChainKey;
  primaryOriginChainId: string;
  primaryDepositIndex: number;
  primaryParentChangeIndex: number;
  primaryNewChangeIndex: number;
  secondaryChainKey: ChainKey;
  secondaryOriginChainId: string;
  secondaryDepositIndex: number;
  secondaryChangeIndex: number;
  secondaryNewChangeIndex: number;
  activity: ActivityItem;
  combinedValue: bigint;
  withdrawn: bigint;
  remaining: bigint;
  primaryOldNullifierHash: string;
  secondaryOldNullifierHash: string;
  primaryNewNullifierHash: string | null;
  createPendingIntent: boolean;
}

/**
 * A planned ragequit (public withdrawal)
 */
export interface PlannedRagequitExtension {
  kind: 'ragequit';
  chainKey: ChainKey;
  originChainId: string;
  depositIndex: number;
  changeIndex: number;
  activity: ActivityItem;
  nullifierHash: string;
}

export type PlannedExtension =
  | Planned1x1Extension
  | PlannedWithdraw2Extension
  | PlannedRagequitExtension;

// ============================================================================
// Planning Context
// ============================================================================

/**
 * Virtual nullifier state for planning
 * Tracks which nullifiers are "consumed" by planned extensions
 */
interface PlanningContext {
  /** Nullifiers that have been planned for consumption */
  consumedNullifiers: Set<string>;
  /** New nullifiers that will be added by planned extensions */
  plannedNullifiers: Map<string, NullifierInfo>;
}

function createPlanningContext(): PlanningContext {
  return {
    consumedNullifiers: new Set(),
    plannedNullifiers: new Map(),
  };
}

// ============================================================================
// Tree Extension Planning (Read-Only)
// ============================================================================

/**
 * Plan extensions for a single tree
 *
 * This function is PURE and READ-ONLY:
 * - Does not mutate tree, nullifierMap, or any other state
 * - Returns a list of planned extensions
 * - Can be called multiple times with same inputs for same results
 */
export function planTreeExtensions(
  tree: NoteTree,
  chainKey: ChainKey,
  allTrees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>,
  activityIndex: ActivityIndex,
  accountKey: bigint,
  poolAddress: string,
): PlannedExtension[] {
  const plans: PlannedExtension[] = [];
  const ctx = createPlanningContext();

  // Get the last spendable leaf to extend from
  const lastLeaf = getLastSpendableLeaf(tree);
  if (!lastLeaf) {
    // No spendable leaf - tree cannot be extended
    return plans;
  }

  // Get root note for origin chainId and depositIndex
  const rootNote = tree.root.note;
  const originChainId = rootNote.originChainId;
  const depositIndex = rootNote.depositIndex;

  // Simulate the tree state as we plan extensions
  // Note: getLastSpendableLeaf guarantees a spendable note
  const lastNote = lastLeaf.note;
  if (!isSpendableNote(lastNote)) {
    throw new Error('Expected spendable note from getLastSpendableLeaf');
  }
  let currentChangeIndex = lastNote.changeIndex;
  let currentAmount = BigInt(lastNote.amount);
  let currentStatus = lastNote.status;
  let currentNoteType = lastNote.noteType;
  let currentLabel = lastNote.label;

  while (true) {
    // Stop if note is not extendable (spent, merged, or zero amount)
    if (currentStatus !== 'unspent' || currentAmount <= 0n) {
      break;
    }

    // Derive nullifier hash for current (virtual) tip
    const nullifierHash = deriveAndHashNullifier(
      accountKey,
      poolAddress,
      originChainId,
      depositIndex,
      currentChangeIndex,
    );

    // Skip if already planned for consumption
    if (ctx.consumedNullifiers.has(nullifierHash)) {
      break;
    }

    // Check for 1:1 withdrawal (same-chain or cross-chain intent)
    const withdrawal =
      activityIndex.sameChainWithdrawalsByNullifier.get(nullifierHash) ??
      activityIndex.crosschainWithdrawIntentsByNullifier.get(nullifierHash);
    if (withdrawal) {
      const plan = plan1x1Withdrawal(
        chainKey,
        originChainId,
        depositIndex,
        currentChangeIndex,
        currentAmount,
        withdrawal,
        nullifierHash,
        accountKey,
        poolAddress,
      );
      plans.push(plan);

      // Update virtual state
      ctx.consumedNullifiers.add(nullifierHash);
      currentChangeIndex = plan.newChangeIndex;
      currentAmount = plan.remaining;
      currentStatus = plan.remaining > 0n ? 'unspent' : 'spent';
      currentNoteType = 'change'; // After withdrawal, tip is always a ChangeNote
      // Label propagates from parent to change notes
      // (currentLabel stays the same - inherited from parent)

      if (plan.newNullifierHash) {
        ctx.plannedNullifiers.set(plan.newNullifierHash, {
          originChainId,
          depositIndex,
          changeIndex: plan.newChangeIndex,
        });
      }
      continue;
    }

    // Check for 2:1 Withdraw2 (same-chain or cross-chain intent)
    const withdraw2 =
      activityIndex.sameChainWithdraw2ByNullifier.get(nullifierHash) ??
      activityIndex.crosschainWithdraw2IntentsByNullifier.get(nullifierHash);
    if (withdraw2) {
      const plan = planWithdraw2(
        tree,
        chainKey,
        originChainId,
        depositIndex,
        currentChangeIndex,
        currentAmount,
        withdraw2,
        nullifierHash,
        allTrees,
        nullifierMap,
        ctx,
        accountKey,
        poolAddress,
      );

      if (plan) {
        plans.push(plan);
        ctx.consumedNullifiers.add(plan.primaryOldNullifierHash);
        ctx.consumedNullifiers.add(plan.secondaryOldNullifierHash);

        // If we're the primary chain, update virtual state
        if (chainKey === plan.primaryChainKey) {
          currentChangeIndex = plan.primaryNewChangeIndex;
          currentAmount = plan.remaining;
          currentStatus = plan.remaining > 0n ? 'unspent' : 'spent';
          currentNoteType = 'change'; // After Withdraw2, primary tip is a ChangeNote
          if (plan.primaryNewNullifierHash) {
            ctx.plannedNullifiers.set(plan.primaryNewNullifierHash, {
              originChainId: plan.primaryOriginChainId,
              depositIndex: plan.primaryDepositIndex,
              changeIndex: plan.primaryNewChangeIndex,
            });
          }
        } else {
          // We're secondary, chain terminates with a merged note (terminal, not spendable)
          // Loop will break on next iteration due to status check
          currentStatus = 'spent';
          currentAmount = 0n;
        }
        continue;
      } else {
        // Other chain not ready
        break;
      }
    }

    // Check for ragequit
    // NOTE: Ragequit detection only works for the ORIGINAL tree leaf (lastLeaf), not
    // for virtually extended notes. This is because we derive commitment from the actual
    // note (which has the label), not from virtual state. If a ragequit occurs after
    // withdrawals, it will be detected in a subsequent sync pass after those withdrawals
    // are persisted.
    // Gate on noteType (ragequit only for deposit/change, not intent notes or refund)
    // Also check that lastLeaf is a spendable note since derivedNoteCommitment requires it
    if (currentNoteType === 'deposit' || currentNoteType === 'change') {
      if (lastLeaf && isSpendableNote(lastLeaf.note)) {
        const commitment = derivedNoteCommitment(accountKey, lastLeaf.note).toString();
        const ragequit = activityIndex.ragequitByCommitment.get(commitment);
        if (ragequit) {
          plans.push({
            kind: 'ragequit',
            chainKey,
            originChainId,
            depositIndex,
            changeIndex: currentChangeIndex,
            activity: ragequit,
            nullifierHash,
          });
          ctx.consumedNullifiers.add(nullifierHash);
          break; // Ragequit is terminal
        }
      }
    }

    // No more matches
    break;
  }

  return plans;
}

// ============================================================================
// Individual Extension Planners (Pure Functions)
// ============================================================================

/**
 * Plan a 1:1 withdrawal extension (pure function)
 */
function plan1x1Withdrawal(
  chainKey: ChainKey,
  originChainId: string,
  depositIndex: number,
  currentChangeIndex: number,
  currentAmount: bigint,
  activity: WithdrawActivity | CrosschainWithdrawIntentActivity,
  oldNullifierHash: string,
  accountKey: bigint,
  poolAddress: string,
): Planned1x1Extension {
  // Use withdrawnValue (the actual value spent from the note in the circuit)
  // NOT amount (the recipient amount after fees)
  const withdrawnValue = activity.withdrawnValue;
  const withdrawn = BigInt(withdrawnValue || 0);
  const remaining = currentAmount - withdrawn;
  const newChangeIndex = currentChangeIndex + 1;

  // Cross-chain intents are pending by definition (waiting for fill)
  const isCrossChainIntent = isCrosschainWithdrawIntent(activity);

  const newNullifierHash =
    remaining > 0n
      ? deriveAndHashNullifier(accountKey, poolAddress, originChainId, depositIndex, newChangeIndex)
      : null;

  return {
    kind: 'withdraw1x1',
    chainKey,
    originChainId,
    depositIndex,
    parentChangeIndex: currentChangeIndex,
    newChangeIndex,
    activity,
    withdrawn,
    remaining,
    oldNullifierHash,
    newNullifierHash,
    createPendingIntent: isCrossChainIntent && withdrawn > 0n,
  };
}

/**
 * Plan a Withdraw2 extension (pure function)
 */
function planWithdraw2(
  currentTree: NoteTree,
  currentChainKey: ChainKey,
  currentOriginChainId: string,
  currentDepositIndex: number,
  currentChangeIndex: number,
  currentAmount: bigint,
  activity: Withdraw2Activity | CrosschainWithdraw2IntentActivity,
  currentNullifierHash: string,
  allTrees: Map<ChainKey, NoteTree>,
  nullifierMap: Map<string, NullifierInfo>,
  ctx: PlanningContext,
  accountKey: bigint,
  poolAddress: string,
): PlannedWithdraw2Extension | null {
  // Get nullifiers array from activity
  if (!('spentNullifiers' in activity) || !activity.spentNullifiers || activity.spentNullifiers.length < 2) {
    return null;
  }

  const nullifiers = activity.spentNullifiers;
  const isNullifier0 = nullifiers[0] === currentNullifierHash;
  const otherNullifierHash = isNullifier0 ? nullifiers[1] : nullifiers[0];

  // Skip if other nullifier already consumed
  if (ctx.consumedNullifiers.has(otherNullifierHash)) {
    return null;
  }

  // Find the other chain - check plannedNullifiers first for virtually extended chains,
  // then fall back to persisted nullifierMap. This allows Withdraw2 to work when one
  // chain was virtually extended earlier in the same planning pass.
  const otherInfo = ctx.plannedNullifiers.get(otherNullifierHash) ?? nullifierMap.get(otherNullifierHash);
  if (!otherInfo) {
    return null;
  }

  const otherChainKey = makeChainKey(otherInfo.originChainId, otherInfo.depositIndex);
  const otherTree = allTrees.get(otherChainKey);
  if (!otherTree) {
    return null;
  }

  const otherLastLeaf = getLastSpendableLeaf(otherTree);
  if (!otherLastLeaf || !isSpendableNote(otherLastLeaf.note) || otherLastLeaf.note.status !== 'unspent') {
    return null;
  }

  // Determine primary chain: larger depositIndex wins (continues with combined balance).
  // This is a deterministic but arbitrary rule chosen for consistency. The primary chain
  // receives the merged balance and can continue being extended; the secondary chain
  // terminates with a 'merged' status note.
  // INVARIANT: This must match the rule in chain-extender.ts for correct behavior.
  const isPrimaryChain = currentDepositIndex > otherInfo.depositIndex;

  const primaryChainKey = isPrimaryChain ? currentChainKey : otherChainKey;
  const primaryOriginChainId = isPrimaryChain ? currentOriginChainId : otherInfo.originChainId;
  const primaryDepositIndex = isPrimaryChain ? currentDepositIndex : otherInfo.depositIndex;
  const primaryChangeIndex = isPrimaryChain ? currentChangeIndex : otherLastLeaf.note.changeIndex;
  const primaryAmount = isPrimaryChain ? currentAmount : BigInt(otherLastLeaf.note.amount);

  const secondaryChainKey = isPrimaryChain ? otherChainKey : currentChainKey;
  const secondaryOriginChainId = isPrimaryChain ? otherInfo.originChainId : currentOriginChainId;
  const secondaryDepositIndex = isPrimaryChain ? otherInfo.depositIndex : currentDepositIndex;
  const secondaryChangeIndex = isPrimaryChain ? otherLastLeaf.note.changeIndex : currentChangeIndex;
  const secondaryAmount = isPrimaryChain ? BigInt(otherLastLeaf.note.amount) : currentAmount;

  const combinedValue = primaryAmount + secondaryAmount;
  // Use withdrawnValue (the actual value spent from the note in the circuit)
  // NOT amount (the recipient amount after fees)
  const withdrawnValue = activity.withdrawnValue;
  const withdrawn = BigInt(withdrawnValue || 0);
  const remaining = combinedValue - withdrawn;
  const primaryNewChangeIndex = primaryChangeIndex + 1;
  const secondaryNewChangeIndex = secondaryChangeIndex + 1;

  // Cross-chain 2:1 intents are pending by definition (waiting for fill)
  const isCrossChainIntent = isCrosschainWithdraw2Intent(activity);

  const primaryNewNullifierHash =
    remaining > 0n
      ? deriveAndHashNullifier(accountKey, poolAddress, primaryOriginChainId, primaryDepositIndex, primaryNewChangeIndex)
      : null;

  return {
    kind: 'withdraw2',
    primaryChainKey,
    primaryOriginChainId,
    primaryDepositIndex,
    primaryParentChangeIndex: primaryChangeIndex,
    primaryNewChangeIndex,
    secondaryChainKey,
    secondaryOriginChainId,
    secondaryDepositIndex,
    secondaryChangeIndex,
    secondaryNewChangeIndex,
    activity,
    combinedValue,
    withdrawn,
    remaining,
    primaryOldNullifierHash: isPrimaryChain ? currentNullifierHash : otherNullifierHash,
    secondaryOldNullifierHash: isPrimaryChain ? otherNullifierHash : currentNullifierHash,
    primaryNewNullifierHash,
    createPendingIntent: isCrossChainIntent && withdrawn > 0n,
  };
}
