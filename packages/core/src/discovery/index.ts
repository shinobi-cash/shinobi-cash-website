/**
 * @shinobi-cash/core/discovery
 *
 * Note Discovery v2 - Modular implementation with Withdraw2 support
 *
 * Processing order (per page):
 * 1. DISCOVER - Find all new deposits, add to nullifier map
 * 2. EXTEND   - Extend all chains with withdrawals (1:1 and 2:1)
 * 3. RECONCILE - Update existing notes with fresh activity data
 */

import type {
  DiscoveryState,
  DiscoveryResult,
  DiscoveryProgress,
  DiscoveryOptions,
  DiscoveryPolicy,
  NoteChain,
  NullifierInfo,
  ActivityFetcher,
  PersistenceCallbacks,
  SerializableDiscoveryState,
} from './types.js';
import { DEFAULT_DISCOVERY_POLICY } from './types.js';
import { buildActivityIndex } from './activity-indexer.js';
import { scanForDeposits } from './deposit-scanner.js';
import { extendAllChains } from './chain-extender.js';
import { reconcileChains } from './reconciler.js';

// ============================================================================
// Re-exports
// ============================================================================

export type {
  Note,
  NoteChain,
  DepositNote,
  ChangeNote,
  RefundNote,
  NoteStatus,
  NullifierInfo,
  DiscoveryState,
  DiscoveryResult,
  DiscoveryProgress,
  DiscoveryOptions,
  DiscoveryPolicy,
  ActivityFetcher,
  PersistenceCallbacks,
  ActivityMetadata,
  ActivityPage,
  SerializableDiscoveryState,
} from './types.js';

export { DEFAULT_DISCOVERY_POLICY } from './types.js';

export { buildActivityIndex, isDepositActivity, is1x1WithdrawalActivity, isWithdraw2Activity } from './activity-indexer.js';
export { scanForDeposits } from './deposit-scanner.js';
export { extendAllChains } from './chain-extender.js';
export { reconcileChains } from './reconciler.js';
export { deriveNullifier, hashNullifier, deriveAndHashNullifier, deriveDepositPrecommitment } from './nullifier-utils.js';
export { createDepositNote, createChangeNote, createWithdraw2ChangeNote, createMergedNote } from './note-factory.js';

// ============================================================================
// NoteDiscovery Class
// ============================================================================

/**
 * NoteDiscovery orchestrates the discovery process
 *
 * - Handles I/O (fetching activities, persisting state)
 * - Delegates logic to pure functions
 * - Supports pagination and resumption
 */
export class NoteDiscovery {
  constructor(
    private readonly fetcher: ActivityFetcher,
    private readonly persistence: PersistenceCallbacks,
  ) {}

  /**
   * Sync notes for a user's account
   *
   * @param publicKey - User's public key (for persistence key)
   * @param poolAddress - Pool contract address
   * @param accountKey - User's account key (for derivation)
   * @param options - Discovery options
   */
  async sync(
    publicKey: string,
    poolAddress: string,
    accountKey: bigint,
    options?: DiscoveryOptions,
  ): Promise<DiscoveryResult> {
    const {
      signal,
      onProgress,
      maxPages,
      pageSize = 100,
      policy = DEFAULT_DISCOVERY_POLICY,
    } = options || {};

    // Load or initialize state
    let state = await this.loadOrInitState(publicKey, poolAddress);

    // Progress tracking
    const progress: DiscoveryProgress = {
      pagesProcessed: 0,
      currentPageActivityCount: 0,
      depositsChecked: 0,
      depositsMatched: state.newDepositsFound,
      complete: false,
    };
    onProgress?.(progress);

    let hasNext = true;
    let pagesProcessed = 0;
    let currentOffset = state.minOffset;

    // Process pages starting from minOffset
    while (hasNext && (!maxPages || pagesProcessed < maxPages)) {
      // Check for abort
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // Fetch activities from current offset
      const page = await this.fetcher(poolAddress, pageSize, currentOffset, 'asc');

      // Process the page (pass currentOffset for tracking discovery position)
      state = this.processPage(state, page.items, accountKey, poolAddress, policy, currentOffset);

      // Move to next page
      currentOffset += page.items.length;
      pagesProcessed++;

      // Update progress
      progress.pagesProcessed = pagesProcessed;
      progress.currentPageActivityCount = page.items.length;
      progress.depositsMatched = state.newDepositsFound;
      onProgress?.(progress);

      // Persist periodically
      if (pagesProcessed % policy.persistEveryPages === 0) {
        // Calculate minOffset before saving
        state.minOffset = calculateMinOffset(state.chains);
        await this.saveState(publicKey, poolAddress, state);
      }

      hasNext = page.pageInfo.hasNextPage;
    }

    // Calculate final minOffset and persist
    state.minOffset = calculateMinOffset(state.chains);
    await this.saveState(publicKey, poolAddress, state);

    // Mark complete
    progress.complete = true;
    onProgress?.(progress);

    return this.buildResult(state);
  }

  // ============================================================================
  // Page Processing
  // ============================================================================

  private processPage(
    state: DiscoveryState,
    activities: import('@shinobi-cash/data').Activity[],
    accountKey: bigint,
    poolAddress: string,
    policy: DiscoveryPolicy,
    currentOffset: number,
  ): DiscoveryState {
    // Build activity index for fast lookups
    const activityIndex = buildActivityIndex(activities);

    // PHASE 1: Discover new deposits (MUST happen first!)
    // This ensures all nullifiers are in the map before extension
    const scanResult = scanForDeposits(
      activityIndex,
      accountKey,
      poolAddress,
      state.nextDepositIndex,
      policy.maxDepositScan,
      currentOffset,
    );

    // Merge new chains into state
    for (const chain of scanResult.newChains) {
      state.chains.set(chain[0]!.depositIndex, chain);
    }
    for (const [hash, info] of scanResult.newNullifierEntries) {
      state.nullifierMap.set(hash, info);
    }
    state.nextDepositIndex = scanResult.nextDepositIndex;
    state.newDepositsFound += scanResult.depositsFound;

    // PHASE 2: Extend all chains (handles both 1:1 and 2:1 withdrawals)
    const extensionResult = extendAllChains(
      state.chains,
      state.nullifierMap,
      activityIndex,
      accountKey,
      poolAddress,
    );
    state.chains = extensionResult.updatedChains;
    state.nullifierMap = extensionResult.updatedNullifierMap;

    // PHASE 3: Reconcile (update ASP status, labels, etc.)
    reconcileChains(state.chains, activities);

    return state;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  private async loadOrInitState(publicKey: string, poolAddress: string): Promise<DiscoveryState> {
    const cached = await this.persistence.loadState(publicKey, poolAddress);
    if (cached) {
      return deserializeState(cached);
    }
    return {
      chains: new Map(),
      nullifierMap: new Map(),
      nextDepositIndex: 0,
      minOffset: 0,
      newDepositsFound: 0,
    };
  }

  private async saveState(publicKey: string, poolAddress: string, state: DiscoveryState): Promise<void> {
    const serializable = serializeState(state);
    await this.persistence.saveState(publicKey, poolAddress, serializable);
  }

  private buildResult(state: DiscoveryState): DiscoveryResult {
    const notes = Array.from(state.chains.values());
    return {
      notes,
      lastUsedIndex: state.nextDepositIndex - 1,
      newNotesFound: state.newDepositsFound,
      minOffset: state.minOffset,
    };
  }
}

// ============================================================================
// Serialization Helpers
// ============================================================================

function serializeState(state: DiscoveryState): SerializableDiscoveryState {
  return {
    chains: Array.from(state.chains.entries()).map(([depositIndex, chain]) => ({
      depositIndex,
      chain,
    })),
    nullifierMap: Array.from(state.nullifierMap.entries()).map(([hash, info]) => ({
      hash,
      info,
    })),
    nextDepositIndex: state.nextDepositIndex,
    minOffset: state.minOffset,
    newDepositsFound: state.newDepositsFound,
  };
}

function deserializeState(serialized: SerializableDiscoveryState): DiscoveryState {
  return {
    chains: new Map(serialized.chains.map((c) => [c.depositIndex, c.chain])),
    nullifierMap: new Map(serialized.nullifierMap.map((n) => [n.hash, n.info])),
    nextDepositIndex: serialized.nextDepositIndex,
    minOffset: serialized.minOffset,
    newDepositsFound: serialized.newDepositsFound,
  };
}

/**
 * Calculate the minimum offset from which we need to re-fetch activities.
 * This is the lowest discoveredAtOffset among all unspent notes.
 */
function calculateMinOffset(chains: Map<number, import('./types.js').NoteChain>): number {
  let minOffset = Number.MAX_SAFE_INTEGER;
  let hasUnspentNotes = false;

  for (const [, chain] of chains) {
    const lastNote = chain[chain.length - 1];
    if (lastNote && lastNote.status === 'unspent') {
      hasUnspentNotes = true;
      // Get the deposit note's discoveredAtOffset
      const depositNote = chain[0];
      if (depositNote?.discoveredAtOffset !== undefined) {
        minOffset = Math.min(minOffset, depositNote.discoveredAtOffset);
      }
    }
  }

  // If no unspent notes, we can start from 0 (or keep current behavior)
  return hasUnspentNotes ? minOffset : 0;
}
