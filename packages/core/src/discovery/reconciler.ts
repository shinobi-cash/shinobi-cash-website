/**
 * @shinobi-cash/core/discovery
 * Phase 3: Reconciliation
 * Updates existing notes with fresh activity data (ASP status, labels, etc.)
 */

import type { Activity } from '@shinobi-cash/data';
import type { NoteChain, DepositNote, DepositIntentNote, WithdrawalIntentNote, ChainKey, Note } from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import { isDepositActivity } from './activity-indexer.js';
import { createRefundNote, createDepositNote } from './note-factory.js';

// ============================================================================
// Reconciler
// ============================================================================

/** Result of reconciliation with new nullifier entries */
export interface ReconcileResult {
  /**
   * Deposit indices that became active (filled deposit intents).
   * Caller should compute nullifier hashes using accountKey and add to nullifier map.
   */
  filledDepositIndices: Array<{ depositIndex: number; poolAddress: string; originChainId: string }>;
}

/**
 * Reconcile existing chains with fresh activity data
 *
 * Updates:
 * - ASP status (pending -> approved/rejected)
 * - Intent status (pending -> filled/refunded)
 * - Labels (assigned by ASP)
 * - DepositIntentNote and WithdrawalIntentNote status (from activity index)
 *
 * @returns New nullifier entries from filled deposit intents
 */
export function reconcileChains(
  chains: Map<ChainKey, NoteChain>,
  activities: Activity[],
  activityIndex?: ActivityIndex,
): ReconcileResult {
  const result: ReconcileResult = {
    filledDepositIndices: [],
  };

  // Build lookup for deposit activities by precommitmentHash
  const depositActivityMap = new Map<string, Activity>();
  for (const activity of activities) {
    if (isDepositActivity(activity) && activity.precommitmentHash) {
      depositActivityMap.set(activity.precommitmentHash, activity);
    }
  }

  // Update each chain with fresh data
  for (const [, chain] of chains) {
    const firstNote = chain[0];
    if (!firstNote) continue;

    // Handle chains starting with DepositNote
    if (firstNote.noteType === 'deposit') {
      const depositNote = firstNote as DepositNote;
      const fresh = depositActivityMap.get(depositNote.precommitmentHash);
      if (!fresh) continue;

      // Check if update is needed
      const aspChanged = depositNote.aspStatus !== fresh.aspStatus;
      const intentChanged = depositNote.intentStatus !== fresh.intentStatus;
      const labelChanged = fresh.label && depositNote.label !== fresh.label?.toString();

      if (!aspChanged && !intentChanged && !labelChanged) {
        continue;
      }

      // Update all notes in the chain
      for (const note of chain) {
        // ASP status propagates to all notes
        if (aspChanged) {
          note.aspStatus = fresh.aspStatus;
        }

        // Intent status and label only on deposit note
        if (note === depositNote) {
          if (intentChanged && fresh.intentStatus) {
            note.intentStatus = fresh.intentStatus;
          }
          if (labelChanged && fresh.label) {
            note.label = fresh.label.toString();
          }
        } else if (labelChanged && fresh.label) {
          // Label propagates to change notes too (inherited from deposit)
          note.label = fresh.label.toString();
        }
      }
    }
    // Note: Intent notes are handled in reconcileIntentNotes
  }

  // Reconcile intent notes with fresh activity data
  if (activityIndex) {
    const intentResult = reconcileIntentNotes(chains, activityIndex);
    // Merge filled deposit indices
    result.filledDepositIndices.push(...intentResult.filledDepositIndices);
  }

  return result;
}

/**
 * Reconcile intent notes with updated intent status from activities
 *
 * For WithdrawalIntentNote (orderId in withdrawalsByOrderId):
 * - intentStatus='filled': Mark as spent (funds delivered to recipient)
 * - intentStatus='refunded': Create RefundNote (spendable funds returned to pool)
 *
 * For DepositIntentNote (orderId in depositsByOrderId):
 * - intentStatus='filled': Create DepositNote (commitment now in pool)
 * - intentStatus='refunded': Mark as spent (funds returned to origin chain)
 */
function reconcileIntentNotes(
  chains: Map<ChainKey, NoteChain>,
  activityIndex: ActivityIndex,
): ReconcileResult {
  const result: ReconcileResult = {
    filledDepositIndices: [],
  };

  for (const [, chain] of chains) {
    // Collect notes to add after iteration (avoid modifying array during iteration)
    const notesToAdd: (ReturnType<typeof createRefundNote> | DepositNote)[] = [];

    for (const note of chain) {
      // Handle both withdrawal and deposit intent notes
      if (note.noteType === 'withdrawalIntent') {
        const withdrawalIntent = note as WithdrawalIntentNote;
        if (!withdrawalIntent.orderId) continue;

        const withdrawalActivity = activityIndex.withdrawalsByOrderId.get(withdrawalIntent.orderId);
        if (withdrawalActivity) {
          reconcileWithdrawalIntent(withdrawalIntent, withdrawalActivity, chain, notesToAdd);
        }
      } else if (note.noteType === 'depositIntent') {
        const depositIntent = note as DepositIntentNote;
        if (!depositIntent.orderId) continue;

        const depositActivity = activityIndex.depositsByOrderId.get(depositIntent.orderId);
        if (depositActivity) {
          reconcileDepositIntent(depositIntent, depositActivity, chain, notesToAdd, result);
        }
      }
    }

    // Add notes to the chain
    for (const newNote of notesToAdd) {
      chain.push(newNote);
    }
  }

  return result;
}

/**
 * Reconcile a WithdrawalIntentNote
 */
function reconcileWithdrawalIntent(
  withdrawalIntent: WithdrawalIntentNote,
  activity: Activity,
  chain: NoteChain,
  notesToAdd: (ReturnType<typeof createRefundNote> | DepositNote)[],
): void {
  // Skip if status hasn't changed
  if (withdrawalIntent.intentStatus === activity.intentStatus) return;

  if (activity.intentStatus === 'filled') {
    // Solver filled - funds delivered to recipient
    withdrawalIntent.intentStatus = 'filled';
    withdrawalIntent.status = 'spent';
    // Update with fill transaction from destination chain
    if (activity.destinationTransactionHash) {
      withdrawalIntent.destinationTransactionHash = activity.destinationTransactionHash;
    }
  } else if (activity.intentStatus === 'refunded') {
    // Refund executed - create RefundNote for spendable funds
    withdrawalIntent.intentStatus = 'refunded';
    withdrawalIntent.status = 'spent';

    // Idempotency guard: check if RefundNote already exists
    const existingRefund = chain.find(
      (n) =>
        n.noteType === 'refund' &&
        n.depositIndex === withdrawalIntent.depositIndex &&
        n.changeIndex === withdrawalIntent.parentChangeIndex &&
        n.orderId === withdrawalIntent.orderId,
    );

    if (!existingRefund) {
      const refundNote = createRefundNote(withdrawalIntent);
      notesToAdd.push(refundNote);
    }
  }
}

/**
 * Reconcile a DepositIntentNote
 */
function reconcileDepositIntent(
  depositIntent: DepositIntentNote,
  activity: Activity,
  chain: NoteChain,
  notesToAdd: (ReturnType<typeof createRefundNote> | DepositNote)[],
  result: ReconcileResult,
): void {
  // Skip if status hasn't changed
  if (depositIntent.intentStatus === activity.intentStatus) return;

  if (activity.intentStatus === 'filled') {
    // Deposit filled - commitment is now in pool, create DepositNote
    depositIntent.intentStatus = 'filled';
    depositIntent.status = 'spent';

    // Idempotency guard: check if DepositNote already exists
    const existingDeposit = chain.find(
      (n) =>
        n.noteType === 'deposit' &&
        n.depositIndex === depositIntent.depositIndex,
    );

    if (!existingDeposit) {
      const depositNote = createDepositNote(
        activity,
        depositIntent.depositIndex,
        depositIntent.poolAddress,
        depositIntent.discoveredAtOffset,
      );
      notesToAdd.push(depositNote);

      // Signal to caller that this deposit is now active
      // Caller should compute nullifier hash using accountKey
      result.filledDepositIndices.push({
        depositIndex: depositIntent.depositIndex,
        poolAddress: depositIntent.poolAddress,
        originChainId: depositIntent.originChainId,
      });
    }
  } else if (activity.intentStatus === 'refunded') {
    // Deposit refunded - funds returned to origin chain, no pool action needed
    depositIntent.intentStatus = 'refunded';
    depositIntent.status = 'spent';
    // No RefundNote - funds went back to user's wallet on origin chain
  }
}
