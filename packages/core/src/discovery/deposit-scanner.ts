/**
 * @shinobi-cash/core/discovery
 * Phase 1: Deposit Discovery
 * Scans for user's deposits by matching precommitments
 */

import type { NoteChain, NullifierInfo } from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import { deriveDepositPrecommitment, deriveAndHashNullifier } from './nullifier-utils.js';
import { createDepositNote, createDepositIntentNote } from './note-factory.js';

// ============================================================================
// Scan Result Type
// ============================================================================

export interface ScanResult {
  /** Newly discovered note chains */
  newChains: NoteChain[];
  /** Nullifier mappings for the new deposits */
  newNullifierEntries: Map<string, NullifierInfo>;
  /** Updated next deposit index to scan */
  nextDepositIndex: number;
  /** Number of filled deposits found (commitment in pool, spendable) */
  filledDepositsFound: number;
  /** Number of pending deposits found (awaiting solver fill) */
  pendingDepositsFound: number;
  /** @deprecated Use filledDepositsFound + pendingDepositsFound. Total deposits found for backwards compat. */
  depositsFound: number;
}

// ============================================================================
// Deposit Scanner
// ============================================================================

/**
 * Scan for user's deposits in the current page of activities
 *
 * Algorithm:
 * 1. Pre-compute precommitments for [startIndex, startIndex + maxScan)
 * 2. Match against deposit activities in the page
 * 3. Sequential scanning - stop at first gap (ensures deterministic discovery)
 *
 * IMPORTANT PROTOCOL ASSUMPTION:
 * This scanner assumes deposit indices are strictly sequential per origin chain.
 * Scanning stops at the first gap, meaning:
 * - If indices 0, 1, 3 exist (gap at 2), only 0 and 1 are discovered
 * - Index 3+ will be discovered in subsequent syncs after index 2 appears
 *
 * This assumption requires:
 * - Activity pages are eventually complete (no permanent gaps)
 * - Reorgs/delayed indexing eventually resolve
 *
 * @param activityIndex - Pre-built activity lookup maps
 * @param accountKey - User's account key for derivation
 * @param poolAddress - Pool contract address
 * @param chainId - Origin chain ID for per-chain scanning
 * @param startIndex - First deposit index to scan
 * @param maxScan - Maximum indices to scan
 * @param currentOffset - Current page offset (for tracking discovery position)
 */
export function scanForDeposits(
  activityIndex: ActivityIndex,
  accountKey: bigint,
  poolAddress: string,
  chainId: number | bigint | string,
  startIndex: number,
  maxScan: number,
  currentOffset?: number,
): ScanResult {
  const result: ScanResult = {
    newChains: [],
    newNullifierEntries: new Map(),
    nextDepositIndex: startIndex,
    filledDepositsFound: 0,
    pendingDepositsFound: 0,
    depositsFound: 0, // Backwards compat - sum of filled + pending
  };

  // Pre-compute precommitments for potential deposit indices
  const precommitmentToIndex = new Map<string, number>();
  for (let i = 0; i < maxScan; i++) {
    const idx = startIndex + i;
    const precommitment = deriveDepositPrecommitment(accountKey, poolAddress, chainId, idx);
    precommitmentToIndex.set(precommitment, idx);
  }

  // Sequential scanning - stop at first gap
  for (let idx = startIndex; idx < startIndex + maxScan; idx++) {
    // Derive precommitment for this index
    const precommitment = deriveDepositPrecommitment(accountKey, poolAddress, chainId, idx);

    // Look up in activity index
    const activity = activityIndex.depositsByPrecommitment.get(precommitment);
    if (!activity) {
      // Gap found - stop scanning (sequential property)
      break;
    }

    // Check if this is a pending cross-chain deposit (not yet filled)
    const isPendingCrossChainDeposit =
      activity.type === 'CROSSCHAIN_DEPOSIT_PENDING' && activity.intentStatus !== 'filled';

    // Create appropriate note type
    let chain: NoteChain;
    if (isPendingCrossChainDeposit) {
      // Pending cross-chain deposit: create DepositIntentNote
      // Don't add to nullifier map yet (commitment not in pool)
      const depositIntent = createDepositIntentNote(activity, idx, poolAddress, currentOffset);
      chain = [depositIntent];
    } else {
      // Filled deposit (same-chain or cross-chain): create DepositNote
      const depositNote = createDepositNote(activity, idx, poolAddress, currentOffset);
      chain = [depositNote];

      // Add nullifier mapping for filled deposits (commitment is in pool)
      const nullifierHash = deriveAndHashNullifier(accountKey, poolAddress, chainId, idx, 0);
      result.newNullifierEntries.set(nullifierHash, {
        originChainId: chainId.toString(),
        depositIndex: idx,
        changeIndex: 0,
      });
    }

    // Add to results
    result.newChains.push(chain);
    result.nextDepositIndex = idx + 1;
    if (isPendingCrossChainDeposit) {
      result.pendingDepositsFound++;
    } else {
      result.filledDepositsFound++;
    }
    result.depositsFound++; // Backwards compat
  }

  return result;
}
