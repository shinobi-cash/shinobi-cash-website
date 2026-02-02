/**
 * @shinobi-cash/core/discovery-v2
 * Phase 3: Reconciliation
 * Updates existing notes with fresh activity data (ASP status, labels, etc.)
 */

import type { Activity } from '@shinobi-cash/data';
import type { NoteChain, DepositNote } from './types.js';
import { isDepositActivity } from './activity-indexer.js';

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
 */
export function reconcileChains(
  chains: Map<number, NoteChain>,
  activities: Activity[],
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
}
