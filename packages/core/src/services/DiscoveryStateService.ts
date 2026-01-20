/**
 * Discovery State Service - Pure State Transitions
 *
 * Stateful note discovery using explicit state transitions.
 * All functions are pure - they take state and return new state.
 *
 * Benefits:
 * - Time-travel debugging
 * - Easy testing (no mocks needed)
 * - Clear invariants
 * - Background worker ready
 */

import type { Activity } from '@shinobi-cash/data';
import type { DiscoveryState, LiveDeposit, DiscoveryPolicy } from '../types/Discovery.js';
import type { ActivityContext } from '../crypto/noteDiscovery.js';
import type { NoteChain, DepositNote } from '../types/Note.js';
import {
  buildActivityIndexMaps,
  buildNoteChain,
  extendNoteChain,
} from '../crypto/noteDiscovery.js';
import {
  deriveDepositNullifier,
  deriveDepositSecret,
  derivePrecommitment,
} from '../crypto/noteDerivation.js';
import type { PrecommitmentHash } from '../types/Hash.js';
import { toHashString } from '../types/Hash.js';
import { dev } from '../utils/dev.js';

/**
 * Initialize discovery state from cached data
 *
 * @param notes - Previously discovered note chains
 * @param lastUsedIndex - Last deposit index used
 * @param offset - Pagination offset for resume
 * @returns Initial discovery state
 */
export function initializeDiscoveryState(
  notes: NoteChain[],
  lastUsedIndex: number,
  offset?: number,
): DiscoveryState {
  // Find all live deposits (unspent with positive amount)
  const liveDeposits: LiveDeposit[] = [];

  for (const chain of notes) {
    const lastNote = chain[chain.length - 1];
    if (
      lastNote &&
      lastNote.status === 'unspent' &&
      lastNote.amount &&
      BigInt(lastNote.amount) > 0n &&
      lastNote.isActivated
    ) {
      liveDeposits.push({
        depositIndex: chain[0]!.depositIndex,
        chain,
        remaining: BigInt(lastNote.amount),
      });
    }
  }

  return {
    notes,
    nextDepositIndex: lastUsedIndex + 1,
    liveDeposits,
    offset,
    newDepositsFound: 0,
  };
}

/**
 * Apply a page of activities to discovery state
 *
 * Pure function that performs state transition.
 * Returns NEW state, does not mutate input.
 *
 * @param state - Current discovery state
 * @param activities - Activities from this page
 * @param accountKey - User's account key
 * @param poolAddress - Pool contract address
 * @param policy - Discovery policy
 * @param newOffset - Pagination offset for next page
 * @returns NEW discovery state with activities applied
 */
export function applyActivityPage(
  state: DiscoveryState,
  activities: Activity[],
  accountKey: bigint,
  poolAddress: string,
  policy: DiscoveryPolicy,
  newOffset?: number,
): DiscoveryState {
  dev.log(`[DiscoveryState] Processing page with ${activities.length} activities`);

  // Build activity context once for this page
  const context: ActivityContext = buildActivityIndexMaps(activities);

  // Phase 1: Reconcile existing deposits (ASP status updates)
  dev.log(`[DiscoveryState] Phase 1: Reconciling ${state.notes.length} existing deposits`);
  const reconciledNotes = reconcileExistingDeposits(state.notes, activities, accountKey, poolAddress);

  // Phase 2: Extend live deposits with new withdrawals
  dev.log(`[DiscoveryState] Phase 2: Extending ${state.liveDeposits.length} live deposits`);
  const { extendedNotes, updatedLiveDeposits } = extendLiveDeposits(
    reconciledNotes,
    state.liveDeposits,
    activities,
    accountKey,
    poolAddress,
    context,
  );

  // Phase 3: Discover new deposits
  dev.log(`[DiscoveryState] Phase 3: Scanning deposit indices ${state.nextDepositIndex}-${state.nextDepositIndex + policy.maxDepositScan - 1}`);
  const { finalNotes, newLiveDeposits, nextDepositIndex, depositsFound } = discoverNewDeposits(
    extendedNotes,
    updatedLiveDeposits,
    activities,
    accountKey,
    poolAddress,
    state.nextDepositIndex,
    policy.maxDepositScan,
    context,
  );

  dev.log(`[DiscoveryState] Page complete: found ${depositsFound} new deposits, next index: ${nextDepositIndex}`);

  return {
    notes: finalNotes,
    nextDepositIndex,
    liveDeposits: newLiveDeposits,
    offset: newOffset,
    newDepositsFound: state.newDepositsFound + depositsFound,
  };
}

/**
 * Reconcile existing deposits with fresh activities
 *
 * Updates ASP status for cached deposits when status changes.
 * Uses precommitmentHash for O(1) lookups.
 *
 * Exported for use in NoteSyncEngine bootstrap reconciliation.
 */
export function reconcileExistingDeposits(
  notes: NoteChain[],
  activities: Activity[],
  accountKey: bigint,
  poolAddress: string,
): NoteChain[] {
  // Build deposit activity map for O(1) lookups
  const depositActivityMap = new Map<PrecommitmentHash, Activity>();
  for (const activity of activities) {
    if ((activity.type === 'DEPOSIT' || activity.type === 'CROSSCHAIN_DEPOSIT') && activity.precommitmentHash) {
      depositActivityMap.set(activity.precommitmentHash, activity);
    }
  }

  // Update each chain if ASP status changed
  return notes.map((chain) => {
    const depositNote = chain[0] as DepositNote;

    const depositActivity = depositActivityMap.get(depositNote.precommitmentHash);
    if (!depositActivity) return chain;

    const oldAspStatus = depositNote.aspStatus;
    const newAspStatus = depositActivity.aspStatus;
    const oldIsActivated = depositNote.isActivated;
    const newIsActivated = depositActivity.label != null;
    const newLabel = depositActivity.label || depositNote.label;

    // No changes needed
    if (oldAspStatus === newAspStatus && oldIsActivated === newIsActivated) {
      return chain;
    }

    // Create updated chain with new status propagated
    return chain.map((note, idx) => ({
      ...note,
      aspStatus: newAspStatus,
      ...(idx === 0 ? { isActivated: newIsActivated, label: newLabel } : {}),
    })) as NoteChain;
  });
}

/**
 * Phase 2: Extend live deposits
 *
 * Follows withdrawal chains for unspent deposits.
 */
function extendLiveDeposits(
  notes: NoteChain[],
  liveDeposits: LiveDeposit[],
  activities: Activity[],
  accountKey: bigint,
  poolAddress: string,
  context: ActivityContext,
): { extendedNotes: NoteChain[]; updatedLiveDeposits: LiveDeposit[] } {
  const notesMap = new Map<number, NoteChain>();
  for (const chain of notes) {
    notesMap.set(chain[0]!.depositIndex, chain);
  }

  const updatedLiveDeposits: LiveDeposit[] = [];

  for (const liveDeposit of liveDeposits) {
    const chain = notesMap.get(liveDeposit.depositIndex);
    if (!chain) continue;

    const extendedChain = extendNoteChain(chain, activities, accountKey, poolAddress, context);

    // Update the chain in the map
    notesMap.set(liveDeposit.depositIndex, extendedChain);

    const lastNote = extendedChain[extendedChain.length - 1]!;

    // Check if still live
    if (lastNote.status === 'unspent' && lastNote.amount && BigInt(lastNote.amount) > 0n) {
      updatedLiveDeposits.push({
        depositIndex: liveDeposit.depositIndex,
        chain: extendedChain,
        remaining: BigInt(lastNote.amount),
      });
    }
  }

  return {
    extendedNotes: Array.from(notesMap.values()),
    updatedLiveDeposits,
  };
}

/**
 * Phase 3: Discover new deposits
 *
 * Scans for new deposits in bounded range.
 */
function discoverNewDeposits(
  notes: NoteChain[],
  liveDeposits: LiveDeposit[],
  activities: Activity[],
  accountKey: bigint,
  poolAddress: string,
  nextDepositIndex: number,
  maxDepositScan: number,
  context: ActivityContext,
): {
  finalNotes: NoteChain[];
  newLiveDeposits: LiveDeposit[];
  nextDepositIndex: number;
  depositsFound: number;
} {
  // Build precommitment map for O(n + k) discovery
  const precommitmentMap = new Map<PrecommitmentHash, number>();
  for (let i = 0; i < maxDepositScan; i++) {
    const depositIndex = nextDepositIndex + i;
    const depositNullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
    const depositSecret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
    const hash = toHashString(derivePrecommitment(depositNullifier, depositSecret));
    precommitmentMap.set(hash, depositIndex);
  }

  // Match activities to deposit indices
  const depositMatches = new Map<number, Activity>();
  for (const activity of activities) {
    if ((activity.type === 'DEPOSIT' || activity.type === 'CROSSCHAIN_DEPOSIT') && activity.precommitmentHash) {
      const depositIndex = precommitmentMap.get(activity.precommitmentHash);
      if (depositIndex !== undefined) {
        depositMatches.set(depositIndex, activity);
      }
    }
  }

  // Process deposits sequentially until first gap
  const finalNotes = [...notes];
  const newLiveDeposits = [...liveDeposits];
  let currentDepositIndex = nextDepositIndex;
  let depositsFound = 0;

  for (let checkIndex = nextDepositIndex; checkIndex < nextDepositIndex + maxDepositScan; checkIndex++) {
    const depositActivity = depositMatches.get(checkIndex);

    if (!depositActivity) {
      // Gap found - stop scanning
      break;
    }

    // Build chain for new deposit
    const depositPosition = activities.indexOf(depositActivity);
    const activitiesAfter = depositPosition !== -1 ? activities.slice(depositPosition + 1) : [];
    const newChain = buildNoteChain(depositActivity, checkIndex, accountKey, poolAddress, activitiesAfter, context);

    finalNotes.push(newChain);
    depositsFound++;

    const lastNote = newChain[newChain.length - 1]!;
    if (lastNote.status === 'unspent' && lastNote.amount && BigInt(lastNote.amount) > 0n && lastNote.isActivated) {
      newLiveDeposits.push({
        depositIndex: checkIndex,
        chain: newChain,
        remaining: BigInt(lastNote.amount),
      });
    }

    currentDepositIndex = checkIndex + 1;
  }

  return {
    finalNotes,
    newLiveDeposits,
    nextDepositIndex: currentDepositIndex,
    depositsFound,
  };
}
