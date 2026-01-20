/**
 * Note Sync Engine
 *
 * Orchestrates stateful note discovery using pure state transitions.
 * Handles lifecycle, persistence, and progress tracking.
 *
 * Benefits:
 * - Clean separation: engine handles I/O, transitions handle logic
 * - Background worker ready
 * - Multi-pool support (future)
 * - Testable (can test pure functions separately)
 */

import type { Activity } from '@shinobi-cash/data';
import type {
  DiscoveryState,
  DiscoveryResult,
  DiscoveryProgress,
  DiscoveryOptions,
  DiscoveryPolicy,
} from '../types/Discovery.js';
import type { NoteChain } from '../types/Note.js';
import { initializeDiscoveryState, applyActivityPage, reconcileExistingDeposits } from './DiscoveryStateService.js';
import { DEFAULT_DISCOVERY_POLICY } from '../types/Discovery.js';

/**
 * Pagination result from activity fetch
 */
export interface ActivityPage {
  items: Activity[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Activity fetcher function type
 */
export type ActivityFetcher = (
  poolAddress: string,
  limit: number,
  offset?: number,
  orderDirection?: 'asc' | 'desc',
) => Promise<ActivityPage>;

/**
 * State persistence callbacks
 */
export interface PersistenceCallbacks {
  /** Load initial state from storage */
  loadState: (publicKey: string, poolAddress: string) => Promise<{
    notes: NoteChain[];
    lastUsedIndex: number;
    offset?: number;
  } | null>;

  /** Save current state to storage */
  saveState: (publicKey: string, poolAddress: string, state: DiscoveryState) => Promise<void>;
}

/**
 * Note Sync Engine
 *
 * Orchestrates discovery using pure state transitions.
 * Follows the class rule: manages session lifecycle and I/O.
 */
export class NoteSyncEngine {
  constructor(
    private readonly fetcher: ActivityFetcher,
    private readonly persistence: PersistenceCallbacks,
  ) {}

  /**
   * Run discovery sync for a pool
   *
   * @param publicKey - User's public key
   * @param poolAddress - Pool contract address
   * @param accountKey - Account key for crypto derivation
   * @param options - Discovery options
   * @returns Discovery result
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

    // Load initial state
    const cached = await this.persistence.loadState(publicKey, poolAddress);
    let state: DiscoveryState = cached
      ? initializeDiscoveryState(cached.notes, cached.lastUsedIndex, cached.offset)
      : initializeDiscoveryState([], -1, undefined);

    // Bootstrap reconciliation: catch ASP status changes for cached notes
    // When resuming from cached offset, recent activities (with status updates) are skipped
    // Fetch recent activities in DESC order to reconcile existing notes before continuing
    if (state.notes.length > 0) {
      const recentActivities = await this.fetcher(poolAddress, pageSize, 0, 'desc');
      if (recentActivities.items.length > 0) {
        state = {
          ...state,
          notes: reconcileExistingDeposits(
            state.notes,
            recentActivities.items,
            accountKey,
            poolAddress,
          ),
        };
        // Re-initialize live deposits after reconciliation (status may have changed)
        state = initializeDiscoveryState(
          state.notes,
          state.nextDepositIndex - 1,
          state.offset,
        );
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

    // Main sync loop
    while (hasNext && (!maxPages || pagesProcessed < maxPages)) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      // Fetch next page
      const page = await this.fetcher(poolAddress, pageSize, state.offset, 'asc');

      // Apply state transition - calculate next offset
      const nextOffset = (state.offset ?? 0) + page.items.length;
      state = applyActivityPage(
        state,
        page.items,
        accountKey,
        poolAddress,
        policy,
        nextOffset,
      );

      pagesProcessed++;

      // Update progress
      progress.pagesProcessed = pagesProcessed;
      progress.currentPageActivityCount = page.items.length;
      progress.depositsMatched = state.newDepositsFound;
      progress.lastOffset = state.offset;
      onProgress?.(progress);

      // Persist state (crash resilience)
      if (pagesProcessed % policy.persistEveryPages === 0) {
        await this.persistence.saveState(publicKey, poolAddress, state);
      }

      hasNext = page.pageInfo.hasNextPage;
    }

    // Final persistence
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

  /**
   * Resume sync from saved state
   *
   * Alias for sync() - state is automatically resumed from persistence.
   */
  async resume(
    publicKey: string,
    poolAddress: string,
    accountKey: bigint,
    options?: DiscoveryOptions,
  ): Promise<DiscoveryResult> {
    return this.sync(publicKey, poolAddress, accountKey, options);
  }
}
