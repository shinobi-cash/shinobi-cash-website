/**
 * @shinobi-cash/core/discovery
 * Phase 3: Reconciliation
 * Updates existing notes with fresh activity data (ASP status, labels, etc.)
 */

import type { Activity } from '@shinobi-cash/data';
import type { NoteChain, DepositNote, PendingIntentNote } from './types.js';
import type { ActivityIndex } from './activity-indexer.js';
import { isDepositActivity } from './activity-indexer.js';
import { createRefundNote } from './note-factory.js';

// ============================================================================
// Reconciler
// ============================================================================

/**
 * Reconcile existing chains with fresh activity data
 *
 * Updates:
 * - ASP status (pending -> approved/rejected)
 * - Intent status (pending -> filled/refunded)
 * - Labels (assigned by ASP)
 * - PendingIntentNote status (from activity index)
 */
export function reconcileChains(
  chains: Map<number, NoteChain>,
  activities: Activity[],
  activityIndex?: ActivityIndex,
): void {
  // Build lookup for deposit activities by precommitmentHash
  const depositActivityMap = new Map<string, Activity>();
  for (const activity of activities) {
    if (isDepositActivity(activity) && activity.precommitmentHash) {
      depositActivityMap.set(activity.precommitmentHash, activity);
    }
  }

  // Update each chain with fresh data
  for (const [, chain] of chains) {
    const depositNote = chain[0] as DepositNote;
    if (!depositNote || depositNote.noteType !== 'deposit') continue;

    const fresh = depositActivityMap.get(depositNote.precommitmentHash);
    if (!fresh) continue;

    // Check if update is needed
    const aspChanged = depositNote.aspStatus !== fresh.aspStatus;
    const intentChanged = depositNote.intentStatus !== fresh.intentStatus;
    const labelChanged = fresh.label && depositNote.label !== fresh.label;

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
          note.label = fresh.label;
        }
      } else if (labelChanged && fresh.label) {
        // Label propagates to change notes too (inherited from deposit)
        note.label = fresh.label;
      }
    }
  }

  // Reconcile PendingIntentNotes with fresh activity data
  if (activityIndex) {
    reconcilePendingIntents(chains, activityIndex);
  }
}

/**
 * Reconcile PendingIntentNotes with updated intent status from activities
 *
 * When a PendingIntentNote's orderId matches an activity with:
 * - intentStatus='filled': Mark the note as spent (funds delivered)
 * - intentStatus='refunded': Create RefundNote (spendable funds returned to pool)
 */
function reconcilePendingIntents(
  chains: Map<number, NoteChain>,
  activityIndex: ActivityIndex,
): void {
  for (const [, chain] of chains) {
    // Collect RefundNotes to add after iteration (avoid modifying array during iteration)
    const refundNotesToAdd: ReturnType<typeof createRefundNote>[] = [];

    for (const note of chain) {
      if (note.noteType !== 'pendingIntent') continue;

      const pendingNote = note as PendingIntentNote;
      if (!pendingNote.orderId) continue;

      // Find activity with matching orderId
      const activity = activityIndex.withdrawalsByOrderId.get(pendingNote.orderId);
      if (!activity) continue;

      // Skip if status hasn't changed
      if (pendingNote.intentStatus === activity.intentStatus) continue;

      // Update intent status
      if (activity.intentStatus === 'filled') {
        // Solver filled - funds delivered to recipient
        pendingNote.intentStatus = 'filled';
        pendingNote.status = 'spent'; // Funds left the system
      } else if (activity.intentStatus === 'refunded') {
        // Refund executed - create RefundNote for spendable funds
        pendingNote.intentStatus = 'refunded';
        pendingNote.status = 'spent'; // PendingIntentNote is consumed

        // Idempotency guard: check if RefundNote already exists for this intent
        // This prevents duplicate RefundNotes on background sync retries
        const existingRefund = chain.find(
          (n) =>
            n.noteType === 'refund' &&
            n.depositIndex === pendingNote.depositIndex &&
            n.changeIndex === pendingNote.parentChangeIndex &&
            n.orderId === pendingNote.orderId,
        );

        if (!existingRefund) {
          // Create RefundNote - the refundCommitment is now in the pool's merkle tree
          const refundNote = createRefundNote(pendingNote);
          refundNotesToAdd.push(refundNote);
        }
      }
    }

    // Add RefundNotes to the chain
    for (const refundNote of refundNotesToAdd) {
      chain.push(refundNote);
    }
  }
}
