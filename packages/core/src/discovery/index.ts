/**
 * @shinobi-cash/core/discovery
 */

import type { Activity } from '@shinobi-cash/data';
import type {
  DiscoveryState,
  DiscoveryResult,
  DiscoveryProgress,
  DiscoveryOptions,
  DiscoveryPolicy,
  LiveDeposit,
  NoteChain,
  DepositNote,
  ChangeNote,
} from './types.js';
import { DEFAULT_DISCOVERY_POLICY } from './types.js';
import { deriveDepositNullifier, deriveDepositSecret, derivePrecommitment } from '../deposit/index.js';
import { deriveChangeNullifier } from '../withdrawal/index.js';
import { poseidon1 } from 'poseidon-lite/poseidon1';

// Re-export types
export type {
  Note,
  NoteChain,
  DepositNote,
  ChangeNote,
  RefundNote,
  DiscoveryResult,
  DiscoveryProgress,
  DiscoveryOptions,
  DiscoveryState,
  DiscoveryPolicy,
  LiveDeposit,
} from './types.js';

export { DEFAULT_DISCOVERY_POLICY } from './types.js';

// ============================================================================
// Public Types
// ============================================================================

export interface ActivityPage {
  items: Activity[];
  pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
}

export type ActivityFetcher = (
  poolAddress: string,
  limit: number,
  offset?: number,
  orderDirection?: 'asc' | 'desc',
) => Promise<ActivityPage>;

export interface PersistenceCallbacks {
  loadState: (publicKey: string, poolAddress: string) => Promise<{
    notes: NoteChain[];
    lastUsedIndex: number;
    offset?: number;
  } | null>;
  saveState: (publicKey: string, poolAddress: string, state: DiscoveryState) => Promise<void>;
}

type ActivityContext = { withdrawalsByNullifier: Map<string, Activity> };

// ============================================================================
// NoteDiscovery - Orchestrates I/O, delegates logic to pure functions
// ============================================================================

export class NoteDiscovery {
  constructor(
    private readonly fetcher: ActivityFetcher,
    private readonly persistence: PersistenceCallbacks,
  ) {}

  async sync(
    publicKey: string,
    poolAddress: string,
    accountKey: bigint,
    options?: DiscoveryOptions,
  ): Promise<DiscoveryResult> {
    const { signal, onProgress, maxPages, pageSize = 100, policy = DEFAULT_DISCOVERY_POLICY } = options || {};

    const cached = await this.persistence.loadState(publicKey, poolAddress);
    let state: DiscoveryState = cached
      ? initializeState(cached.notes, cached.lastUsedIndex, cached.offset)
      : initializeState([], -1, undefined);

    if (state.notes.length > 0) {
      const recentActivities = await this.fetcher(poolAddress, pageSize, 0, 'desc');
      if (recentActivities.items.length > 0) {
        state = {
          ...state,
          notes: reconcileDeposits(state.notes, recentActivities.items),
        };
        state = initializeState(state.notes, state.nextDepositIndex - 1, state.offset);
      }
    }

    const progress: DiscoveryProgress = {
      pagesProcessed: 0,
      currentPageActivityCount: 0,
      depositsChecked: 0,
      depositsMatched: 0,
      lastOffset: state.offset,
      complete: false,
    };
    onProgress?.(progress);

    let hasNext = true;
    let pagesProcessed = 0;

    while (hasNext && (!maxPages || pagesProcessed < maxPages)) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const page = await this.fetcher(poolAddress, pageSize, state.offset, 'asc');
      const nextOffset = (state.offset ?? 0) + page.items.length;

      state = applyActivityPage(state, page.items, accountKey, poolAddress, policy, nextOffset);
      pagesProcessed++;

      progress.pagesProcessed = pagesProcessed;
      progress.currentPageActivityCount = page.items.length;
      progress.depositsMatched = state.newDepositsFound;
      progress.lastOffset = state.offset;
      onProgress?.(progress);

      if (pagesProcessed % policy.persistEveryPages === 0) {
        await this.persistence.saveState(publicKey, poolAddress, state);
      }

      hasNext = page.pageInfo.hasNextPage;
    }

    await this.persistence.saveState(publicKey, poolAddress, state);
    progress.complete = true;
    onProgress?.(progress);

    return {
      notes: state.notes,
      lastUsedIndex: state.nextDepositIndex - 1,
      newNotesFound: state.newDepositsFound,
      lastProcessedOffset: state.offset,
    };
  }
}

// ============================================================================
// State Initialization
// ============================================================================

function initializeState(notes: NoteChain[], lastUsedIndex: number, offset?: number): DiscoveryState {
  const liveDeposits: LiveDeposit[] = [];

  for (const chain of notes) {
    const lastNote = chain[chain.length - 1];
    const isInPool = !lastNote?.isCrossChain || lastNote.intentStatus === 'filled';

    if (lastNote?.status === 'unspent' && lastNote.amount && BigInt(lastNote.amount) > 0n && isInPool) {
      liveDeposits.push({
        depositIndex: chain[0]!.depositIndex,
        chain,
        remaining: BigInt(lastNote.amount),
      });
    }
  }

  return { notes, nextDepositIndex: lastUsedIndex + 1, liveDeposits, offset, newDepositsFound: 0 };
}

// ============================================================================
// Page Processing
// ============================================================================

function applyActivityPage(
  state: DiscoveryState,
  activities: Activity[],
  accountKey: bigint,
  poolAddress: string,
  policy: DiscoveryPolicy,
  newOffset?: number,
): DiscoveryState {
  const context = buildActivityIndex(activities);

  const reconciledNotes = reconcileDeposits(state.notes, activities);

  const { extendedNotes, updatedLiveDeposits } = extendLiveDeposits(
    reconciledNotes, state.liveDeposits, activities, accountKey, poolAddress, context,
  );

  const { finalNotes, newLiveDeposits, nextDepositIndex, depositsFound } = discoverNewDeposits(
    extendedNotes, updatedLiveDeposits, activities, accountKey, poolAddress,
    state.nextDepositIndex, policy.maxDepositScan, context,
  );

  return {
    notes: finalNotes,
    nextDepositIndex,
    liveDeposits: newLiveDeposits,
    offset: newOffset,
    newDepositsFound: state.newDepositsFound + depositsFound,
  };
}

// ============================================================================
// Phase 1: Reconciliation
// ============================================================================

function reconcileDeposits(notes: NoteChain[], activities: Activity[]): NoteChain[] {
  const depositActivityMap = new Map<string, Activity>();
  for (const activity of activities) {
    if (isDepositActivity(activity) && activity.precommitmentHash) {
      depositActivityMap.set(activity.precommitmentHash, activity);
    }
  }

  return notes.map((chain) => {
    const depositNote = chain[0] as DepositNote;
    const fresh = depositActivityMap.get(depositNote.precommitmentHash);
    if (!fresh) return chain;

    if (depositNote.aspStatus === fresh.aspStatus && depositNote.intentStatus === fresh.intentStatus) {
      return chain;
    }

    return chain.map((note, idx) => ({
      ...note,
      aspStatus: fresh.aspStatus,
      ...(idx === 0 ? { intentStatus: fresh.intentStatus, label: fresh.label || depositNote.label } : {}),
    })) as NoteChain;
  });
}

// ============================================================================
// Phase 2: Chain Extension
// ============================================================================

function extendLiveDeposits(
  notes: NoteChain[],
  liveDeposits: LiveDeposit[],
  activities: Activity[],
  accountKey: bigint,
  poolAddress: string,
  context: ActivityContext,
): { extendedNotes: NoteChain[]; updatedLiveDeposits: LiveDeposit[] } {
  const notesMap = new Map<number, NoteChain>();
  for (const chain of notes) notesMap.set(chain[0]!.depositIndex, chain);

  const updatedLiveDeposits: LiveDeposit[] = [];

  for (const live of liveDeposits) {
    const chain = notesMap.get(live.depositIndex);
    if (!chain) continue;

    const extended = extendNoteChain(chain, activities, accountKey, poolAddress, context);
    notesMap.set(live.depositIndex, extended);

    const lastNote = extended[extended.length - 1]!;
    if (lastNote.status === 'unspent' && lastNote.amount && BigInt(lastNote.amount) > 0n) {
      updatedLiveDeposits.push({ depositIndex: live.depositIndex, chain: extended, remaining: BigInt(lastNote.amount) });
    }
  }

  return { extendedNotes: Array.from(notesMap.values()), updatedLiveDeposits };
}

function extendNoteChain(
  chain: NoteChain,
  activities: Activity[],
  accountKey: bigint,
  poolAddress: string,
  context?: ActivityContext,
): NoteChain {
  if (chain.length === 0) return chain;

  const lastNote = chain[chain.length - 1]!;
  if (lastNote.amount == null || (lastNote.status === 'spent' && BigInt(lastNote.amount) <= 0n)) {
    return chain;
  }

  const { withdrawalsByNullifier } = context || buildActivityIndex(activities);
  const newChain = [...chain];
  let remaining = BigInt(lastNote.amount);
  let changeIndex = lastNote.changeIndex === 0 ? 1 : lastNote.changeIndex + 1;

  let nullifier = lastNote.changeIndex === 0
    ? deriveDepositNullifier(accountKey, poolAddress, chain[0]!.depositIndex)
    : deriveChangeNullifier(accountKey, poolAddress, chain[0]!.depositIndex, lastNote.changeIndex);

  while (true) {
    const nullifierHash = poseidon1([nullifier]).toString();
    const withdrawal = withdrawalsByNullifier.get(nullifierHash);
    if (!withdrawal?.newCommitment || withdrawal.amount == null) break;

    newChain[newChain.length - 1] = { ...newChain[newChain.length - 1]!, status: 'spent' as const };
    remaining -= BigInt(withdrawal.amount);

    newChain.push(createChangeNote(chain[0] as DepositNote, changeIndex, remaining, withdrawal));

    if (remaining <= 0n) break;

    nullifier = deriveChangeNullifier(accountKey, poolAddress, chain[0]!.depositIndex, changeIndex);
    changeIndex++;
  }

  return newChain;
}

// ============================================================================
// Phase 3: New Deposit Discovery
// ============================================================================

function discoverNewDeposits(
  notes: NoteChain[],
  liveDeposits: LiveDeposit[],
  activities: Activity[],
  accountKey: bigint,
  poolAddress: string,
  nextDepositIndex: number,
  maxDepositScan: number,
  context: ActivityContext,
): { finalNotes: NoteChain[]; newLiveDeposits: LiveDeposit[]; nextDepositIndex: number; depositsFound: number } {
  const precommitmentMap = new Map<string, number>();
  for (let i = 0; i < maxDepositScan; i++) {
    const idx = nextDepositIndex + i;
    const nullifier = deriveDepositNullifier(accountKey, poolAddress, idx);
    const secret = deriveDepositSecret(accountKey, poolAddress, idx);
    precommitmentMap.set(derivePrecommitment(nullifier, secret).toString(), idx);
  }

  const matches = new Map<number, Activity>();
  for (const activity of activities) {
    if (isDepositActivity(activity) && activity.precommitmentHash) {
      const idx = precommitmentMap.get(activity.precommitmentHash);
      if (idx !== undefined) matches.set(idx, activity);
    }
  }

  const finalNotes = [...notes];
  const newLiveDeposits = [...liveDeposits];
  let currentIdx = nextDepositIndex;
  let found = 0;

  for (let idx = nextDepositIndex; idx < nextDepositIndex + maxDepositScan; idx++) {
    const activity = matches.get(idx);
    if (!activity) break;

    const pos = activities.indexOf(activity);
    const after = pos !== -1 ? activities.slice(pos + 1) : [];
    const chain = buildNoteChain(activity, idx, accountKey, poolAddress, after, context);

    finalNotes.push(chain);
    found++;

    const lastNote = chain[chain.length - 1]!;
    const isInPool = !lastNote.isCrossChain || lastNote.intentStatus === 'filled';
    if (lastNote.status === 'unspent' && lastNote.amount && BigInt(lastNote.amount) > 0n && isInPool) {
      newLiveDeposits.push({ depositIndex: idx, chain, remaining: BigInt(lastNote.amount) });
    }

    currentIdx = idx + 1;
  }

  return { finalNotes, newLiveDeposits, nextDepositIndex: currentIdx, depositsFound: found };
}

// ============================================================================
// Note Chain Construction
// ============================================================================

function buildNoteChain(
  activity: Activity,
  depositIndex: number,
  accountKey: bigint,
  poolAddress: string,
  activitiesAfter: Activity[],
  context?: ActivityContext,
): NoteChain {
  if (!activity.precommitmentHash) {
    throw new Error(`Indexer must provide precommitmentHash for deposit ${depositIndex}`);
  }

  const originChainId = activity.originChainId.toString();
  const destChainId = (activity.destinationChainId || activity.originChainId).toString();
  const isCrossChain = activity.type === 'CROSSCHAIN_DEPOSIT' ||
    activity.type === 'CROSSCHAIN_DEPOSIT_PENDING' ||
    originChainId !== destChainId;

  const depositNote: DepositNote = {
    poolAddress,
    depositIndex,
    changeIndex: 0,
    noteType: 'deposit',
    amount: activity.amount?.toString() || '0',
    originTransactionHash: activity.originTransactionHash,
    destinationTransactionHash: activity.destinationTransactionHash || activity.originTransactionHash,
    originChainId,
    destinationChainId: destChainId,
    blockNumber: activity.blockNumber.toString(),
    timestamp: activity.timestamp.toString(),
    status: 'unspent',
    aspStatus: activity.aspStatus,
    label: activity.label || `Pending Deposit #${depositIndex}`,
    precommitmentHash: activity.precommitmentHash,
    isCrossChain,
    orderId: activity.orderId ?? undefined,
    intentStatus: isCrossChain ? (activity.intentStatus ?? 'pending') : undefined,
    fillDeadline: activity.fillDeadline?.toString(),
    expires: activity.expires?.toString(),
    activityData: {
      originalAmount: activity.originalAmount?.toString(),
      vettingFeeAmount: activity.vettingFeeAmount?.toString(),
      solverFeeAmount: activity.solverFeeAmount?.toString(),
      user: activity.user,
      solver: activity.solver,
      vettingFeeRecipient: activity.vettingFeeRecipient,
      commitment: activity.commitment,
    },
  };

  return extendNoteChain([depositNote], activitiesAfter, accountKey, poolAddress, context);
}

function createChangeNote(deposit: DepositNote, changeIndex: number, remaining: bigint, withdrawal: Activity): ChangeNote {
  return {
    poolAddress: deposit.poolAddress,
    depositIndex: deposit.depositIndex,
    changeIndex,
    noteType: 'change',
    amount: remaining.toString(),
    originTransactionHash: withdrawal.originTransactionHash,
    destinationTransactionHash: withdrawal.destinationTransactionHash || withdrawal.originTransactionHash,
    originChainId: withdrawal.originChainId.toString(),
    destinationChainId: (withdrawal.destinationChainId || withdrawal.originChainId).toString(),
    blockNumber: withdrawal.blockNumber.toString(),
    timestamp: withdrawal.timestamp.toString(),
    status: remaining > 0n ? 'unspent' : 'spent',
    aspStatus: deposit.aspStatus,
    label: deposit.label,
    refundCommitment: withdrawal.refundCommitment,
    isCrossChain: deposit.isCrossChain,
    orderId: deposit.orderId,
    intentStatus: deposit.isCrossChain ? (withdrawal.intentStatus ?? 'filled') : undefined,
    activityData: {
      originalAmount: withdrawal.originalAmount?.toString(),
      vettingFeeAmount: withdrawal.vettingFeeAmount?.toString(),
      relayFeeAmount: withdrawal.relayFeeAmount?.toString(),
      solverFeeAmount: withdrawal.solverFeeAmount?.toString(),
      paymasterFeeRefund: withdrawal.paymasterFeeRefund?.toString(),
      recipient: withdrawal.recipient,
      relayer: withdrawal.relayer,
      solver: withdrawal.solver,
      commitment: withdrawal.commitment,
      spentNullifier: withdrawal.spentNullifier,
      newCommitment: withdrawal.newCommitment,
      isSponsored: withdrawal.isSponsored,
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

function buildActivityIndex(activities: Activity[]): ActivityContext {
  const withdrawalsByNullifier = new Map<string, Activity>();
  for (const a of activities) {
    if ((a.type === 'WITHDRAWAL' || a.type === 'CROSSCHAIN_WITHDRAWAL') && a.spentNullifier) {
      withdrawalsByNullifier.set(a.spentNullifier, a);
    }
  }
  return { withdrawalsByNullifier };
}

function isDepositActivity(a: Activity): boolean {
  return a.type === 'DEPOSIT' || a.type === 'CROSSCHAIN_DEPOSIT' || a.type === 'CROSSCHAIN_DEPOSIT_PENDING';
}
