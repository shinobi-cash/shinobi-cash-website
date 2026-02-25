/**
 * @shinobi-cash/core/discovery
 * Phase 1: Deposit Discovery
 * Scans for user's deposits by matching precommitments
 */

import {
  type ActivityItem,
  isDeposit,
  isCrosschainDepositFill,
  isCrosschainDepositIntent,
} from "@shinobi-cash/data";
import type { NoteTree, NullifierInfo, NoteDeriver } from "./types.js";
import type { ActivityIndex } from "./activity-indexer.js";
import {
  createDepositNote,
  createCrosschainDepositNote,
  createDepositIntent,
} from "./note-factory.js";
import { createNoteTree } from "./tree-utils.js";

// ============================================================================
// Scan Result Type
// ============================================================================

export interface ScanResult {
  /** Newly discovered note trees */
  newTrees: NoteTree[];
  /** Nullifier mappings for the new deposits */
  newNullifierEntries: Map<string, NullifierInfo>;
  /** Raw activities that matched user's deposits */
  matchedActivities: ActivityItem[];
  /** Updated next deposit index to scan */
  nextDepositIndex: number;
  /** Number of filled deposits found (commitment in pool, spendable) */
  filledDepositsFound: number;
  /** Number of pending deposits found (awaiting solver fill) */
  pendingDepositsFound: number;
}

// ============================================================================
// Deposit Scanner
// ============================================================================

/**
 * Scan for user's deposits in the activity index
 *
 * Algorithm:
 * 1. Starting from startIndex, derive precommitment for each index
 * 2. Look up in activity index
 * 3. Stop at first gap (sequential property)
 *
 * IMPORTANT PROTOCOL ASSUMPTION:
 * Deposit indices are strictly sequential per origin chain.
 * Scanning stops at the first gap, meaning:
 * - If indices 0, 1, 3 exist (gap at 2), only 0 and 1 are discovered
 * - Index 3+ will be discovered in subsequent syncs after index 2 appears
 *
 * @param activityIndex - Pre-built activity lookup maps
 * @param deriver - Note deriver for cryptographic derivations
 * @param poolAddress - Pool contract address
 * @param chainId - Origin chain ID for per-chain scanning
 * @param startIndex - First deposit index to scan
 * @param currentOffset - Current page offset (for tracking discovery position)
 */
export function scanForDeposits(
  activityIndex: ActivityIndex,
  deriver: NoteDeriver,
  poolAddress: string,
  chainId: number | bigint | string,
  startIndex: number,
  currentOffset?: number
): ScanResult {
  const result: ScanResult = {
    newTrees: [],
    newNullifierEntries: new Map(),
    matchedActivities: [],
    nextDepositIndex: startIndex,
    filledDepositsFound: 0,
    pendingDepositsFound: 0,
  };

  // Sequential scanning - stop at first gap
  for (let idx = startIndex; ; idx++) {
    // Derive precommitment for this index
    const precommitment = deriver.derivePrecommitment(poolAddress, Number(chainId), idx);

    // Look up in activity index
    const activity = activityIndex.depositsByPrecommitment.get(precommitment);
    if (!activity) {
      // Gap found - stop scanning (sequential property)
      break;
    }

    // Create appropriate note type based on activity type
    let tree: NoteTree;
    let isPending = false;

    if (isCrosschainDepositIntent(activity)) {
      // Cross-chain deposit intent: create DepositIntent
      // Don't add to nullifier map yet (commitment not in pool)
      const depositIntent = createDepositIntent(activity, idx, poolAddress, currentOffset);
      tree = createNoteTree(depositIntent);
      isPending = true;
    } else if (isCrosschainDepositFill(activity)) {
      // Filled cross-chain deposit: create CrosschainDepositNote
      // Pass chainId as originChainId since we're scanning for deposits from this chain
      const crosschainDeposit = createCrosschainDepositNote(
        activity,
        idx,
        poolAddress,
        currentOffset,
        chainId.toString()
      );
      tree = createNoteTree(crosschainDeposit);
    } else if (isDeposit(activity)) {
      // Same-chain deposit: create DepositNote
      const depositNote = createDepositNote(activity, idx, poolAddress, currentOffset);
      tree = createNoteTree(depositNote);
    } else {
      // Unknown deposit type - skip
      continue;
    }

    // Add nullifier mapping for filled deposits (commitment is in pool)
    if (!isPending) {
      const nullifierHash = deriver.deriveNullifierHash(poolAddress, Number(chainId), idx, 0);
      result.newNullifierEntries.set(nullifierHash, {
        originChainId: chainId.toString(),
        depositIndex: idx,
        changeIndex: 0,
      });
    }

    // Add to results
    result.newTrees.push(tree);
    result.matchedActivities.push(activity);
    result.nextDepositIndex = idx + 1;
    if (isPending) {
      result.pendingDepositsFound++;
    } else {
      result.filledDepositsFound++;
    }
  }

  return result;
}
