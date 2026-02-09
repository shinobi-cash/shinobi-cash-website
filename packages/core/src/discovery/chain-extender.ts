/**
 * @shinobi-cash/core/discovery
 * Phase 2: Chain Extension
 *
 * Extends note chains with withdrawals (both 1:1 and 2:1 Withdraw2)
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

import type { NoteChain, NullifierInfo } from './types.js';
import type { ChainKey } from './types.js';
import { makeChainKey } from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import {
  createChangeNote,
  createWithdraw2ChangeNote,
  createMergedNote,
  createWithdrawalIntentNote,
} from './note-factory.js';
import {
  planChainExtensions,
  type PlannedExtension,
  type Planned1x1Extension,
  type PlannedWithdraw2Extension,
  type PlannedRagequitExtension,
} from './chain-extension-planner.js';

// ============================================================================
// Extension Result Type
// ============================================================================

export interface ExtensionResult {
  /** Updated chains after extension (keyed by ChainKey) */
  updatedChains: Map<ChainKey, NoteChain>;
  /** Updated nullifier map after extension */
  updatedNullifierMap: Map<string, NullifierInfo>;
}

// ============================================================================
// Chain Extender (Orchestrator)
// ============================================================================

/**
 * Extend all chains with withdrawals from the current activity page
 *
 * Uses Plan/Apply pattern:
 * 1. Plan all extensions (pure, read-only)
 * 2. Apply all extensions (mechanical mutation)
 */
export function extendAllChains(
  chains: Map<ChainKey, NoteChain>,
  nullifierMap: Map<string, NullifierInfo>,
  activityIndex: ActivityIndex,
  accountKey: bigint,
  poolAddress: string,
): ExtensionResult {
  const updatedChains = new Map(chains);
  const updatedNullifierMap = new Map(nullifierMap);

  // Track processed Withdraw2s to avoid double-processing
  const processedWithdraw2s = new Set<string>();

  // Collect all plans first (PLANNING PHASE - read-only)
  const allPlans: Array<{ chainKey: ChainKey; plans: PlannedExtension[] }> = [];

  for (const [chainKey, chain] of updatedChains) {
    const plans = planChainExtensions(
      chain,
      chainKey,
      updatedChains,
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
  for (const { chainKey, plans } of allPlans) {
    const chain = updatedChains.get(chainKey);
    if (!chain) continue;

    for (const plan of plans) {
      applyExtension(
        plan,
        updatedChains,
        updatedNullifierMap,
        processedWithdraw2s,
        accountKey,
        poolAddress,
      );
    }
  }

  return { updatedChains, updatedNullifierMap };
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
  chains: Map<ChainKey, NoteChain>,
  nullifierMap: Map<string, NullifierInfo>,
  processedWithdraw2s: Set<string>,
  accountKey: bigint,
  poolAddress: string,
): void {
  switch (plan.kind) {
    case 'withdraw1x1':
      apply1x1Withdrawal(plan, chains, nullifierMap);
      break;
    case 'withdraw2':
      applyWithdraw2(plan, chains, nullifierMap, processedWithdraw2s);
      break;
    case 'ragequit':
      applyRagequit(plan, chains, nullifierMap);
      break;
  }
}

/**
 * Apply a 1:1 withdrawal extension
 */
function apply1x1Withdrawal(
  plan: Planned1x1Extension,
  chains: Map<ChainKey, NoteChain>,
  nullifierMap: Map<string, NullifierInfo>,
): void {
  const chain = chains.get(plan.chainKey);
  if (!chain) return;

  const lastNote = chain[chain.length - 1];
  if (!lastNote) return;

  // Mark current note as spent
  lastNote.status = 'spent';

  // Create change note
  const changeNote = createChangeNote(lastNote, plan.activity, plan.newChangeIndex, plan.remaining);
  chain.push(changeNote);

  // Create WithdrawalIntentNote if needed (for cross-chain withdrawals)
  if (plan.createPendingIntent) {
    const withdrawalIntent = createWithdrawalIntentNote(lastNote, plan.activity, plan.parentChangeIndex);
    chain.push(withdrawalIntent);
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
  chains: Map<ChainKey, NoteChain>,
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

  const primaryChain = chains.get(plan.primaryChainKey);
  const secondaryChain = chains.get(plan.secondaryChainKey);

  if (!primaryChain || !secondaryChain) return;

  const primaryLastNote = primaryChain[primaryChain.length - 1];
  const secondaryLastNote = secondaryChain[secondaryChain.length - 1];

  if (!primaryLastNote || !secondaryLastNote) return;

  // Mark both notes as spent
  primaryLastNote.status = 'spent';
  secondaryLastNote.status = 'spent';

  // Create change note on primary chain
  const changeNote = createWithdraw2ChangeNote(
    primaryLastNote,
    plan.activity,
    plan.primaryNewChangeIndex,
    plan.remaining,
    plan.secondaryDepositIndex,
  );
  primaryChain.push(changeNote);

  // Create WithdrawalIntentNote if needed (for cross-chain Withdraw2)
  if (plan.createPendingIntent) {
    const withdrawalIntent = createWithdrawalIntentNote(
      primaryLastNote,
      plan.activity,
      plan.primaryParentChangeIndex,
    );
    primaryChain.push(withdrawalIntent);
  }

  // Create merged note on secondary chain
  const mergedNote = createMergedNote(
    secondaryLastNote,
    plan.activity,
    plan.secondaryNewChangeIndex,
    plan.primaryDepositIndex,
  );
  secondaryChain.push(mergedNote);

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
  chains: Map<ChainKey, NoteChain>,
  nullifierMap: Map<string, NullifierInfo>,
): void {
  const chain = chains.get(plan.chainKey);
  if (!chain) return;

  const lastNote = chain[chain.length - 1];
  if (!lastNote) return;

  // Mark note as spent
  lastNote.status = 'spent';

  // Store ragequit activity data
  lastNote.activityData = {
    ...lastNote.activityData,
    ragequitTxHash: plan.activity.originTransactionHash,
    ragequitTimestamp: plan.activity.timestamp.toString(),
    ragequitBlockNumber: plan.activity.blockNumber.toString(),
    ragequitUser: plan.activity.user,
  };

  // Remove nullifier
  nullifierMap.delete(plan.nullifierHash);
}
