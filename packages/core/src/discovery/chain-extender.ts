/**
 * @shinobi-cash/core/discovery
 * Phase 2: Chain Extension
 * Extends note chains with withdrawals (both 1:1 and 2:1 Withdraw2)
 */

import type { Activity } from '@shinobi-cash/data';
import type { NoteChain, NullifierInfo, Note } from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import { deriveAndHashNullifier } from './nullifier-utils.js';
import { createChangeNote, createWithdraw2ChangeNote, createMergedNote } from './note-factory.js';
import { derivedNoteCommitment } from '../withdrawal/index.js';

// ============================================================================
// Extension Result Type
// ============================================================================

export interface ExtensionResult {
  /** Updated chains after extension */
  updatedChains: Map<number, NoteChain>;
  /** Updated nullifier map after extension */
  updatedNullifierMap: Map<string, NullifierInfo>;
}

// ============================================================================
// Chain Extender
// ============================================================================

/**
 * Extend all chains with withdrawals from the current activity page
 *
 * For each chain with an unspent tip:
 * 1. Derive nullifier for current tip
 * 2. Check for 1:1 withdrawal -> create change note
 * 3. Check for 2:1 Withdraw2 -> merge chains
 * 4. Repeat until no more matches
 */
export function extendAllChains(
  chains: Map<number, NoteChain>,
  nullifierMap: Map<string, NullifierInfo>,
  activityIndex: ActivityIndex,
  accountKey: bigint,
  poolAddress: string,
): ExtensionResult {
  const updatedChains = new Map(chains);
  const updatedNullifierMap = new Map(nullifierMap);

  // Process each chain
  for (const [depositIndex, chain] of updatedChains) {
    extendSingleChain(
      chain,
      depositIndex,
      updatedChains,
      updatedNullifierMap,
      activityIndex,
      accountKey,
      poolAddress,
    );
  }

  return { updatedChains, updatedNullifierMap };
}

// ============================================================================
// Single Chain Extension
// ============================================================================

function extendSingleChain(
  chain: NoteChain,
  depositIndex: number,
  allChains: Map<number, NoteChain>,
  nullifierMap: Map<string, NullifierInfo>,
  activityIndex: ActivityIndex,
  accountKey: bigint,
  poolAddress: string,
): void {
  while (true) {
    const lastNote = chain[chain.length - 1];
    if (!lastNote) break;

    // Stop if note is not extendable
    if (lastNote.status !== 'unspent' || BigInt(lastNote.amount) <= 0n) {
      break;
    }

    // Derive nullifier hash for current tip
    const nullifierHash = deriveAndHashNullifier(
      accountKey,
      poolAddress,
      depositIndex,
      lastNote.changeIndex,
    );

    // Check for 1:1 withdrawal first
    const withdrawal = activityIndex.withdrawalsByNullifier.get(nullifierHash);
    if (withdrawal) {
      process1x1Withdrawal(
        chain,
        depositIndex,
        lastNote,
        withdrawal,
        nullifierMap,
        nullifierHash,
        accountKey,
        poolAddress,
      );
      continue;
    }

    // Check for 2:1 Withdraw2
    const withdraw2 = activityIndex.withdraw2ByNullifier.get(nullifierHash);
    if (withdraw2) {
      const resolved = processWithdraw2(
        chain,
        depositIndex,
        lastNote,
        withdraw2,
        nullifierHash,
        allChains,
        nullifierMap,
        accountKey,
        poolAddress,
      );
      if (!resolved) {
        // Other chain not ready - stop extending this chain
        break;
      }
      continue;
    }

    // Check for ragequit (public withdrawal)
    const commitment = derivedNoteCommitment(accountKey, lastNote).toString();
    const ragequit = activityIndex.ragequitByCommitment.get(commitment);
    if (ragequit) {
      processRagequit(lastNote, ragequit, nullifierMap, nullifierHash);
      break; // Ragequit is final - no more extensions possible
    }

    // No more withdrawals found
    break;
  }
}

// ============================================================================
// 1:1 Withdrawal Processing
// ============================================================================

function process1x1Withdrawal(
  chain: NoteChain,
  depositIndex: number,
  lastNote: Note,
  withdrawal: Activity,
  nullifierMap: Map<string, NullifierInfo>,
  oldNullifierHash: string,
  accountKey: bigint,
  poolAddress: string,
): void {
  // Calculate remaining amount
  const withdrawn = BigInt(withdrawal.amount || 0);
  const remaining = BigInt(lastNote.amount) - withdrawn;

  // Mark current note as spent
  lastNote.status = 'spent';

  // Create change note
  const newChangeIndex = lastNote.changeIndex + 1;
  const changeNote = createChangeNote(lastNote, withdrawal, newChangeIndex, remaining);
  chain.push(changeNote);

  // Update nullifier map
  nullifierMap.delete(oldNullifierHash);
  if (remaining > 0n) {
    const newNullifierHash = deriveAndHashNullifier(accountKey, poolAddress, depositIndex, newChangeIndex);
    nullifierMap.set(newNullifierHash, { depositIndex, changeIndex: newChangeIndex });
  }
}

// ============================================================================
// 2:1 Withdraw2 Processing
// ============================================================================

/**
 * Process a Withdraw2 (2:1 JoinSplit) activity
 *
 * Chain inheritance rule: The most recent deposit (latest depositIndex) continues
 * - Primary chain (latest/larger depositIndex): Continues with combined change note
 * - Secondary chain (older/smaller depositIndex): Terminates, marked as 'merged'
 *
 * @returns true if resolved, false if other chain not ready
 */
function processWithdraw2(
  currentChain: NoteChain,
  currentDepositIndex: number,
  currentLastNote: Note,
  activity: Activity,
  currentNullifierHash: string,
  allChains: Map<number, NoteChain>,
  nullifierMap: Map<string, NullifierInfo>,
  accountKey: bigint,
  poolAddress: string,
): boolean {
  // Determine which nullifier is ours
  const isNullifier0 = activity.spentNullifier === currentNullifierHash;
  const otherNullifierHash = isNullifier0 ? activity.spentNullifier1! : activity.spentNullifier!;

  // Find the other chain
  const otherInfo = nullifierMap.get(otherNullifierHash);
  if (!otherInfo) {
    // Other chain not discovered yet - shouldn't happen with correct discovery order
    return false;
  }

  const otherChain = allChains.get(otherInfo.depositIndex);
  if (!otherChain) {
    return false;
  }

  const otherLastNote = otherChain[otherChain.length - 1];
  if (!otherLastNote) {
    return false;
  }

  // Determine which chain is primary (latest/most recent deposit continues)
  const isPrimaryChain = currentDepositIndex > otherInfo.depositIndex;

  // Check if other chain already processed this Withdraw2
  if (otherLastNote.status !== 'unspent') {
    if ((otherLastNote.status === 'spent' || otherLastNote.status === 'merged') && isPrimaryChain) {
      // Secondary chain processed first and marked itself spent
      // Primary chain still needs to handle both chains
      // Fall through to processAsPrimaryChain
    } else {
      // Either: primary already processed (both are done), or
      // current is secondary and other chain is in unexpected state
      return true;
    }
  }

  if (isPrimaryChain) {
    // This chain continues with the combined change note
    processAsPrimaryChain(
      currentChain,
      currentDepositIndex,
      currentLastNote,
      otherChain,
      otherLastNote,
      otherInfo.depositIndex,
      activity,
      nullifierMap,
      currentNullifierHash,
      otherNullifierHash,
      accountKey,
      poolAddress,
    );
  } else {
    // This chain terminates - gets merged into the primary chain
    // Primary chain will handle nullifier cleanup
    processAsSecondaryChain(currentLastNote, otherInfo.depositIndex);
  }

  return true;
}

/**
 * Process current chain as the primary (continuing) chain in a Withdraw2
 * - Creates combined change note with value from both chains
 * - Marks secondary chain's note as merged
 * - Cleans up nullifiers for both chains
 */
function processAsPrimaryChain(
  primaryChain: NoteChain,
  primaryDepositIndex: number,
  primaryLastNote: Note,
  secondaryChain: NoteChain,
  secondaryLastNote: Note,
  secondaryDepositIndex: number,
  activity: Activity,
  nullifierMap: Map<string, NullifierInfo>,
  primaryNullifierHash: string,
  secondaryNullifierHash: string,
  accountKey: bigint,
  poolAddress: string,
): void {
  // Calculate combined remaining value
  const combined = BigInt(primaryLastNote.amount) + BigInt(secondaryLastNote.amount);
  const withdrawn = BigInt(activity.amount || 0);
  const remaining = combined - withdrawn;

  // Mark primary note as spent
  primaryLastNote.status = 'spent';

  // Mark secondary note as spent (it contributed to the merge)
  secondaryLastNote.status = 'spent';

  // Create change note on primary chain (receives combined balance minus withdrawal)
  const primaryNewChangeIndex = primaryLastNote.changeIndex + 1;
  const changeNote = createWithdraw2ChangeNote(
    primaryLastNote,
    activity,
    primaryNewChangeIndex,
    remaining,
    secondaryDepositIndex,
  );
  primaryChain.push(changeNote);

  // Create merged note on secondary chain (balance = 0, linked to primary)
  const secondaryNewChangeIndex = secondaryLastNote.changeIndex + 1;
  const mergedNote = createMergedNote(
    secondaryLastNote,
    activity,
    secondaryNewChangeIndex,
    primaryDepositIndex,
  );
  secondaryChain.push(mergedNote);

  // Update nullifier map - remove both old nullifiers
  nullifierMap.delete(primaryNullifierHash);
  nullifierMap.delete(secondaryNullifierHash);

  // Add new nullifier if there's remaining balance
  if (remaining > 0n) {
    const newNullifierHash = deriveAndHashNullifier(
      accountKey,
      poolAddress,
      primaryDepositIndex,
      primaryNewChangeIndex,
    );
    nullifierMap.set(newNullifierHash, { depositIndex: primaryDepositIndex, changeIndex: primaryNewChangeIndex });
  }
}

/**
 * Process current chain as the secondary (terminating) chain in a Withdraw2
 * - Marks note as spent so the while loop exits
 * - The primary chain will handle creating the merged note when processed
 */
function processAsSecondaryChain(currentLastNote: Note, _primaryDepositIndex: number): void {
  // Mark as spent so the while loop exits (note is no longer 'unspent')
  // The primary chain will create the proper merged note and update this chain
  currentLastNote.status = 'spent';
}

// ============================================================================
// Ragequit Processing
// ============================================================================

/**
 * Process a ragequit (public withdrawal)
 * - Marks the note as spent
 * - Stores ragequit activity data on the note
 * - No change note is created (ragequit withdraws the full amount)
 * - Removes the nullifier from the map
 */
function processRagequit(
  lastNote: Note,
  ragequit: Activity,
  nullifierMap: Map<string, NullifierInfo>,
  nullifierHash: string,
): void {
  // Mark note as spent
  lastNote.status = 'spent';

  // Store ragequit activity data on the note for UI display
  lastNote.activityData = {
    ...lastNote.activityData,
    ragequitTxHash: ragequit.originTransactionHash,
    ragequitTimestamp: ragequit.timestamp.toString(),
    ragequitBlockNumber: ragequit.blockNumber.toString(),
    ragequitUser: ragequit.user,
  };

  // Remove nullifier from map (no change note for ragequit)
  nullifierMap.delete(nullifierHash);
}
