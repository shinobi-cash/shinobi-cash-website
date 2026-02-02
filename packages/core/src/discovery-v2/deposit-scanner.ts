/**
 * @shinobi-cash/core/discovery-v2
 * Phase 1: Deposit Discovery
 * Scans for user's deposits by matching precommitments
 */

import type { NoteChain, NullifierInfo } from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import { deriveDepositPrecommitment, deriveAndHashNullifier } from './nullifier-utils.js';
import { createDepositNote } from './note-factory.js';

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
  /** Number of deposits found */
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
 * @param activityIndex - Pre-built activity lookup maps
 * @param accountKey - User's account key for derivation
 * @param poolAddress - Pool contract address
 * @param startIndex - First deposit index to scan
 * @param maxScan - Maximum indices to scan
 */
export function scanForDeposits(
  activityIndex: ActivityIndex,
  accountKey: bigint,
  poolAddress: string,
  startIndex: number,
  maxScan: number,
): ScanResult {
  const result: ScanResult = {
    newChains: [],
    newNullifierEntries: new Map(),
    nextDepositIndex: startIndex,
    depositsFound: 0,
  };

  // Pre-compute precommitments for potential deposit indices
  const precommitmentToIndex = new Map<string, number>();
  for (let i = 0; i < maxScan; i++) {
    const idx = startIndex + i;
    const precommitment = deriveDepositPrecommitment(accountKey, poolAddress, idx);
    precommitmentToIndex.set(precommitment, idx);
  }

  // Sequential scanning - stop at first gap
  for (let idx = startIndex; idx < startIndex + maxScan; idx++) {
    // Derive precommitment for this index
    const precommitment = deriveDepositPrecommitment(accountKey, poolAddress, idx);

    // Look up in activity index
    const activity = activityIndex.depositsByPrecommitment.get(precommitment);
    if (!activity) {
      // Gap found - stop scanning (sequential property)
      break;
    }

    // Create deposit note and chain
    const depositNote = createDepositNote(activity, idx, poolAddress);
    const chain: NoteChain = [depositNote];

    // Add nullifier mapping for this deposit
    const nullifierHash = deriveAndHashNullifier(accountKey, poolAddress, idx, 0);
    result.newNullifierEntries.set(nullifierHash, { depositIndex: idx, changeIndex: 0 });

    // Add to results
    result.newChains.push(chain);
    result.nextDepositIndex = idx + 1;
    result.depositsFound++;
  }

  return result;
}
