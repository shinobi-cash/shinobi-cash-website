/**
 * @shinobi-cash/core/discovery
 *
 * Note Discovery SDK - Public API
 *
 * This module provides:
 * - NoteDiscovery class for discovering user's notes from the indexer
 * - Note types and type guards for working with discovered notes
 * - Query functions for filtering, sorting, and categorizing notes
 * - Tree utilities for traversal and serialization
 */

import type {
  DiscoveryState,
  DiscoveryResult,
  DiscoveryProgress,
  DiscoveryOptions,
  DiscoveryPolicy,
  NoteTree,
  Note,
  ActivityFetcher,
  PersistenceCallbacks,
  SerializableDiscoveryState,
  ChainKey,
} from "./types.js";
import { DEFAULT_DISCOVERY_POLICY, makeChainKey } from "./types.js";
import { buildActivityIndex } from "./activity-indexer.js";
import { scanForDeposits } from "./deposit-scanner.js";
import { extendAllTrees } from "./chain-extender.js";
import { reconcileTrees } from "./reconciler.js";
import { deriveAndHashNullifier } from "./nullifier-utils.js";
import { serializeTree, deserializeTree, getSpendableLeaves } from "./tree-utils.js";

// ============================================================================
// Note Types
// ============================================================================

export type {
  // Union types
  Note,
  SpendableNote,
  Intent,
  NoteOrIntent,
  // Individual note types (for type narrowing after guards)
  DepositNote,
  CrosschainDepositNote,
  WithdrawalNote,
  CrosschainWithdrawalNote,
  ChangeNote,
  WithdrawalRefundedNote,
  RagequitNote,
  MergedNote,
  DepositRefundedNote,
  // Intent types (pending cross-chain operations)
  DepositIntent,
  WithdrawalIntent,
  // Tree structure
  NoteNode,
  NoteTree,
} from "./types.js";

// ============================================================================
// Type Guards
// ============================================================================

export {
  // Note type guards
  isDepositNote,
  isCrosschainDepositNote,
  isWithdrawalNote,
  isCrosschainWithdrawalNote,
  isChangeNote,
  isRagequitNote,
  isMergedNote,
  isDepositRefundedNote,
  isWithdrawalRefundedNote,
  // Intent type guards
  isIntent,
  isNote,
  isDepositIntent,
  isWithdrawalIntent,
  // Category guards
  isSpendableNote,
  isTerminalNote,
  isCrossChainNote,
} from "./types.js";

// ============================================================================
// Note Queries - Category, Filtering, Sorting
// ============================================================================

export type { NoteCategory, ActivityType } from "./note-queries.js";

export {
  // Category determination
  getNoteCategory,
  getNoteCategoryWithContext,
  getTreeCategory,
  getTreeCategories,
  treeMatchesCategory,
  // Action availability
  canWithdraw,
  canRagequit,
  // Filtering and sorting
  filterNoteTrees,
  getNoteTreeCounts,
  sortTreesByTimestamp,
  // Note extraction
  getSpendableNotes,
  getWithdrawableNotes,
} from "./note-queries.js";

// ============================================================================
// Tree Utilities
// ============================================================================

export {
  // Traversal
  traverseTree,
  getLeafNodes,
  getSpendableLeaves,
  getTotalSpendableBalance,
  // Serialization (for storage)
  serializeTree,
  deserializeTree,
} from "./tree-utils.js";

// ============================================================================
// Discovery - Main API
// ============================================================================

export type {
  // Discovery result types
  DiscoveryResult,
  DiscoveryProgress,
  DiscoveryOptions,
  // For implementing persistence callbacks
  ActivityFetcher,
  PersistenceCallbacks,
  SerializableDiscoveryState,
  SerializableNoteNode,
  NullifierInfo,
  ChainKey,
} from "./types.js";

// Re-export ActivityItem type for consumers
export type { ActivityItem } from "@shinobi-cash/data";

// For persistence callback implementation
export { makeChainKey } from "./types.js";

// ============================================================================
// NoteDiscovery Class
// ============================================================================

/**
 * NoteDiscovery orchestrates the discovery process
 *
 * Usage:
 * ```typescript
 * const discovery = new NoteDiscovery(activityFetcher, persistenceCallbacks);
 * const result = await discovery.sync(publicKey, poolAddress, accountKey, options);
 * ```
 */
export class NoteDiscovery {
  constructor(
    private readonly fetcher: ActivityFetcher,
    private readonly persistence: PersistenceCallbacks
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
    options?: DiscoveryOptions
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

    // Rebuild nullifier map if empty (migration for old cached data)
    if (state.nullifierMap.size === 0 && state.trees.size > 0) {
      rebuildNullifierMap(state, accountKey, poolAddress);
    }

    // Progress tracking
    const progress: DiscoveryProgress = {
      pagesProcessed: 0,
      currentPageActivityCount: 0,
      depositsChecked: 0,
      depositsMatched: state.newFilledDepositsFound,
      complete: false,
    };
    onProgress?.(progress);

    let hasNext = true;
    let pagesProcessed = 0;
    let currentOffset = state.minOffset;

    // Process pages starting from minOffset
    while (hasNext && (!maxPages || pagesProcessed < maxPages)) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const page = await this.fetcher(poolAddress, pageSize, currentOffset, "asc");
      state = this.processPage(state, page.items, accountKey, poolAddress, policy, currentOffset);

      currentOffset += page.items.length;
      pagesProcessed++;

      progress.pagesProcessed = pagesProcessed;
      progress.currentPageActivityCount = page.items.length;
      progress.depositsMatched = state.newFilledDepositsFound;
      onProgress?.(progress);

      if (pagesProcessed % policy.persistEveryPages === 0) {
        state.minOffset = calculateMinOffset(state.trees);
        await this.saveState(publicKey, poolAddress, state);
      }

      hasNext = page.pageInfo.hasNextPage;
    }

    state.minOffset = calculateMinOffset(state.trees);
    await this.saveState(publicKey, poolAddress, state);

    progress.complete = true;
    onProgress?.(progress);

    return this.buildResult(state);
  }

  private processPage(
    state: DiscoveryState,
    activities: import("@shinobi-cash/data").ActivityItem[],
    accountKey: bigint,
    poolAddress: string,
    policy: DiscoveryPolicy,
    currentOffset: number
  ): DiscoveryState {
    const activityIndex = buildActivityIndex(activities);

    // Phase 1: Discover new deposits
    const chainIds = new Set<string>();
    for (const activity of activities) {
      if (
        activity.type === "DEPOSIT" ||
        activity.type === "CROSSCHAIN_DEPOSIT_FILL" ||
        activity.type === "CROSSCHAIN_DEPOSIT_INTENT"
      ) {
        chainIds.add(activity.chainId);
      }
    }

    for (const chainId of chainIds) {
      const startIndex = state.nextDepositIndex.get(chainId) ?? 0;
      const scanResult = scanForDeposits(
        activityIndex,
        accountKey,
        poolAddress,
        chainId,
        startIndex,
        currentOffset
      );

      for (const tree of scanResult.newTrees) {
        const rootNote = tree.root.note;
        const key = makeChainKey(rootNote.originChainId, rootNote.depositIndex);
        state.trees.set(key, tree);
      }
      for (const [hash, info] of scanResult.newNullifierEntries) {
        state.nullifierMap.set(hash, info);
      }
      // Store matched deposit activities
      for (const activity of scanResult.matchedActivities) {
        state.activities.set(activity.txHash, activity);
      }
      state.nextDepositIndex.set(chainId, scanResult.nextDepositIndex);
      state.newFilledDepositsFound += scanResult.filledDepositsFound;
      state.newPendingDepositsFound += scanResult.pendingDepositsFound;
    }

    // Phase 2: Reconcile intent notes
    const reconcileResult = reconcileTrees(state.trees, activities, activityIndex);

    for (const filled of reconcileResult.filledDepositIndices) {
      const nullifierHash = deriveAndHashNullifier(
        accountKey,
        filled.poolAddress,
        filled.originChainId,
        filled.depositIndex,
        0
      );
      state.nullifierMap.set(nullifierHash, {
        originChainId: filled.originChainId,
        depositIndex: filled.depositIndex,
        changeIndex: 0,
      });
    }
    // Store matched reconciliation activities (filled/refunded intents)
    for (const activity of reconcileResult.matchedActivities) {
      state.activities.set(activity.txHash, activity);
    }

    // Phase 3: Extend trees with withdrawals
    const extensionResult = extendAllTrees(
      state.trees,
      state.nullifierMap,
      activityIndex,
      accountKey,
      poolAddress
    );
    state.trees = extensionResult.updatedTrees;
    state.nullifierMap = extensionResult.updatedNullifierMap;
    // Store matched withdrawal/ragequit activities
    for (const activity of extensionResult.matchedActivities) {
      state.activities.set(activity.txHash, activity);
    }

    return state;
  }

  private async loadOrInitState(publicKey: string, poolAddress: string): Promise<DiscoveryState> {
    const cached = await this.persistence.loadState(publicKey, poolAddress);
    if (cached) {
      return deserializeDiscoveryState(cached);
    }
    return {
      trees: new Map(),
      nullifierMap: new Map(),
      nextDepositIndex: new Map(),
      activities: new Map(),
      minOffset: 0,
      newFilledDepositsFound: 0,
      newPendingDepositsFound: 0,
    };
  }

  private async saveState(
    publicKey: string,
    poolAddress: string,
    state: DiscoveryState
  ): Promise<void> {
    const serializable = serializeDiscoveryState(state);
    await this.persistence.saveState(publicKey, poolAddress, serializable);
  }

  private buildResult(state: DiscoveryState): DiscoveryResult {
    const trees = Array.from(state.trees.values());
    const lastUsedIndexByChain = new Map<string, number>();
    for (const [chainId, nextIndex] of state.nextDepositIndex) {
      lastUsedIndexByChain.set(chainId, nextIndex - 1);
    }

    // Sort activities by timestamp descending (newest first)
    const activities = Array.from(state.activities.values()).sort(
      (a, b) => Number(b.timestamp) - Number(a.timestamp)
    );

    return {
      trees,
      lastUsedIndexByChain,
      activities,
      newNotesFound: state.newFilledDepositsFound,
      minOffset: state.minOffset,
    };
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Rebuild nullifier map from trees (migration for old cached data without nullifierMap)
 *
 * For each tree, finds all spendable leaves and adds their nullifiers to the map.
 * This enables Withdraw2 to find the "other" note's nullifier.
 *
 * @internal Exported for testing
 */
export function rebuildNullifierMap(
  state: DiscoveryState,
  accountKey: bigint,
  poolAddress: string
): void {
  for (const tree of state.trees.values()) {
    // getSpendableLeaves already filters for spendable notes with status === 'unspent'
    const spendableLeaves = getSpendableLeaves(tree);
    for (const leaf of spendableLeaves) {
      const note = leaf.note;
      const nullifierHash = deriveAndHashNullifier(
        accountKey,
        poolAddress,
        note.originChainId,
        note.depositIndex,
        note.changeIndex
      );
      state.nullifierMap.set(nullifierHash, {
        originChainId: note.originChainId,
        depositIndex: note.depositIndex,
        changeIndex: note.changeIndex,
      });
    }
  }
}

function serializeDiscoveryState(state: DiscoveryState): SerializableDiscoveryState {
  // data-v2 activities are already string-based, no serialization needed
  return {
    trees: Array.from(state.trees.entries()).map(([chainKey, tree]) => ({
      chainKey,
      tree: serializeTree(tree),
    })),
    nullifierMap: Array.from(state.nullifierMap.entries()).map(([hash, info]) => ({ hash, info })),
    nextDepositIndex: Array.from(state.nextDepositIndex.entries()).map(([chainId, index]) => ({
      chainId,
      index,
    })),
    activities: Array.from(state.activities.values()),
    minOffset: state.minOffset,
    newFilledDepositsFound: state.newFilledDepositsFound,
    newPendingDepositsFound: state.newPendingDepositsFound,
  };
}

function deserializeDiscoveryState(serialized: SerializableDiscoveryState): DiscoveryState {
  // data-v2 activities are already string-based, build map keyed by txHash
  const activities = new Map((serialized.activities ?? []).map((a) => [a.txHash, a]));

  return {
    trees: new Map(serialized.trees.map((t) => [t.chainKey, deserializeTree(t.tree)])),
    nullifierMap: new Map(serialized.nullifierMap.map((n) => [n.hash, n.info])),
    nextDepositIndex: new Map(serialized.nextDepositIndex.map((n) => [n.chainId, n.index])),
    activities,
    minOffset: serialized.minOffset,
    newFilledDepositsFound: serialized.newFilledDepositsFound ?? 0,
    newPendingDepositsFound: serialized.newPendingDepositsFound ?? 0,
  };
}

function calculateMinOffset(trees: Map<ChainKey, NoteTree>): number {
  let minOffset = Number.MAX_SAFE_INTEGER;
  let hasUnspentNotes = false;

  for (const [, tree] of trees) {
    const spendableLeaves = getSpendableLeaves(tree);
    if (spendableLeaves.length > 0) {
      hasUnspentNotes = true;
      const rootNote = tree.root.note;
      if (rootNote.discoveredAtOffset !== undefined) {
        minOffset = Math.min(minOffset, rootNote.discoveredAtOffset);
      }
    }
  }

  return hasUnspentNotes ? minOffset : 0;
}
