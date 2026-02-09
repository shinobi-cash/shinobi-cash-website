/**
 * @shinobi-cash/core/discovery
 * Phase 2: Chain Extension Planning (Read-Only)
 *
 * Pure planning layer for chain extensions.
 * All functions in this file are read-only - no mutations allowed.
 */

import type { Activity } from '@shinobi-cash/data';
import type { NoteChain, NullifierInfo, ChainKey } from './types.js';
import { makeChainKey } from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import { deriveAndHashNullifier } from './nullifier-utils.js';
import { derivedNoteCommitment } from '../withdrawal/index.js';

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
  activity: Activity;
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
  activity: Activity;
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
  activity: Activity;
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
// Chain Extension Planning (Read-Only)
// ============================================================================

/**
 * Plan extensions for a single chain
 *
 * This function is PURE and READ-ONLY:
 * - Does not mutate chain, nullifierMap, or any other state
 * - Returns a list of planned extensions
 * - Can be called multiple times with same inputs for same results
 */
export function planChainExtensions(
  chain: NoteChain,
  chainKey: ChainKey,
  allChains: Map<ChainKey, NoteChain>,
  nullifierMap: Map<string, NullifierInfo>,
  activityIndex: ActivityIndex,
  accountKey: bigint,
  poolAddress: string,
): PlannedExtension[] {
  const plans: PlannedExtension[] = [];
  const ctx = createPlanningContext();

  // Simulate the chain state as we plan extensions
  let currentChangeIndex = chain.length > 0 ? chain[chain.length - 1].changeIndex : -1;
  let currentAmount = chain.length > 0 ? BigInt(chain[chain.length - 1].amount) : 0n;
  let currentStatus = chain.length > 0 ? chain[chain.length - 1].status : 'spent';
  let currentNoteType = chain.length > 0 ? chain[chain.length - 1].noteType : 'deposit';
  let currentLabel = chain.length > 0 ? chain[chain.length - 1].label : undefined;
  // Get origin chainId and depositIndex from the first note in chain (deposit note)
  const originChainId = chain.length > 0 ? chain[0].originChainId : '0';
  const depositIndex = chain.length > 0 ? chain[0].depositIndex : 0;

  while (true) {
    // Stop if note is not extendable
    // Intent notes (both deposit and withdrawal) cannot be extended
    if (
      currentNoteType === 'depositIntent' ||
      currentNoteType === 'withdrawalIntent' ||
      currentStatus !== 'unspent' ||
      currentAmount <= 0n
    ) {
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

    // Check for 1:1 withdrawal
    const withdrawal = activityIndex.withdrawalsByNullifier.get(nullifierHash);
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

    // Check for 2:1 Withdraw2
    const withdraw2 = activityIndex.withdraw2ByNullifier.get(nullifierHash);
    if (withdraw2) {
      const plan = planWithdraw2(
        chain,
        chainKey,
        originChainId,
        depositIndex,
        currentChangeIndex,
        currentAmount,
        withdraw2,
        nullifierHash,
        allChains,
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
          // We're secondary, chain terminates with a merged note
          currentStatus = 'merged';
          currentAmount = 0n;
          currentNoteType = 'change'; // Merged note is a ChangeNote (with status='merged')
        }
        continue;
      } else {
        // Other chain not ready
        break;
      }
    }

    // Check for ragequit
    // NOTE: Ragequit detection only works for the ORIGINAL chain tip (lastNote), not
    // for virtually extended notes. This is because we derive commitment from the actual
    // note (which has the label), not from virtual state. If a ragequit occurs after
    // withdrawals, it will be detected in a subsequent sync pass after those withdrawals
    // are persisted.
    // Gate on noteType (ragequit only for deposit/change, not intent notes or refund)
    // Also check lastNote.label since derivedNoteCommitment requires it
    if (currentNoteType === 'deposit' || currentNoteType === 'change') {
      const lastNote = chain[chain.length - 1];
      if (lastNote && lastNote.label !== undefined) {
        const commitment = derivedNoteCommitment(accountKey, lastNote).toString();
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
  activity: Activity,
  oldNullifierHash: string,
  accountKey: bigint,
  poolAddress: string,
): Planned1x1Extension {
  const withdrawn = BigInt(activity.amount || 0);
  const remaining = currentAmount - withdrawn;
  const newChangeIndex = currentChangeIndex + 1;

  const isCrossChainPending =
    (activity.type === 'CROSSCHAIN_WITHDRAWAL_PENDING' ||
      activity.type === 'CROSSCHAIN_WITHDRAW2_PENDING') &&
    activity.intentStatus === 'pending';

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
    createPendingIntent: isCrossChainPending && withdrawn > 0n,
  };
}

/**
 * Plan a Withdraw2 extension (pure function)
 */
function planWithdraw2(
  currentChain: NoteChain,
  currentChainKey: ChainKey,
  currentOriginChainId: string,
  currentDepositIndex: number,
  currentChangeIndex: number,
  currentAmount: bigint,
  activity: Activity,
  currentNullifierHash: string,
  allChains: Map<ChainKey, NoteChain>,
  nullifierMap: Map<string, NullifierInfo>,
  ctx: PlanningContext,
  accountKey: bigint,
  poolAddress: string,
): PlannedWithdraw2Extension | null {
  // Determine which nullifier is ours
  const isNullifier0 = activity.spentNullifier === currentNullifierHash;
  const otherNullifierHash = isNullifier0 ? activity.spentNullifier1! : activity.spentNullifier!;

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
  const otherChain = allChains.get(otherChainKey);
  if (!otherChain) {
    return null;
  }

  const otherLastNote = otherChain[otherChain.length - 1];
  if (!otherLastNote || otherLastNote.status !== 'unspent') {
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
  const primaryChangeIndex = isPrimaryChain ? currentChangeIndex : otherLastNote.changeIndex;
  const primaryAmount = isPrimaryChain ? currentAmount : BigInt(otherLastNote.amount);

  const secondaryChainKey = isPrimaryChain ? otherChainKey : currentChainKey;
  const secondaryOriginChainId = isPrimaryChain ? otherInfo.originChainId : currentOriginChainId;
  const secondaryDepositIndex = isPrimaryChain ? otherInfo.depositIndex : currentDepositIndex;
  const secondaryChangeIndex = isPrimaryChain ? otherLastNote.changeIndex : currentChangeIndex;
  const secondaryAmount = isPrimaryChain ? BigInt(otherLastNote.amount) : currentAmount;

  const combinedValue = primaryAmount + secondaryAmount;
  const withdrawn = BigInt(activity.amount || 0);
  const remaining = combinedValue - withdrawn;
  const primaryNewChangeIndex = primaryChangeIndex + 1;
  const secondaryNewChangeIndex = secondaryChangeIndex + 1;

  const isCrossChainPending =
    activity.type === 'CROSSCHAIN_WITHDRAW2_PENDING' && activity.intentStatus === 'pending';

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
    createPendingIntent: isCrossChainPending && withdrawn > 0n,
  };
}
