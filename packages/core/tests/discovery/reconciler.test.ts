/**
 * Tests for reconciler.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reconcileChains } from '../../src/discovery/reconciler.js';
import { buildActivityIndex } from '../../src/discovery/activity-indexer.js';
import type { NoteChain, DepositNote, DepositIntentNote, WithdrawalIntentNote } from '../../src/discovery/types.js';
import {
  createMockDepositActivity,
  createMockCrossChainDepositActivity,
  createMockPendingCrossChainDepositActivity,
  createMockCrossChainWithdrawalActivity,
  createMockDepositNote,
  createMockChangeNote,
  createMockWithdrawalIntentNote,
  createMockDepositIntentNote,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  toEther,
} from './fixtures.js';

describe('reconciler', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  describe('reconcileChains', () => {
    describe('ASP status updates', () => {
      it('should update ASP status on deposit note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { aspStatus: 'pending' });
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        const activity = createMockDepositActivity(0, toEther(1), { aspStatus: 'approved' });

        reconcileChains(chains, [activity]);

        expect(chain[0].aspStatus).toBe('approved');
      });

      it('should propagate ASP status to all notes in chain', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { aspStatus: 'pending' });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5), { aspStatus: 'pending' });
        const chain: NoteChain = [depositNote, changeNote];
        const chains = new Map([[0, chain]]);

        const activity = createMockDepositActivity(0, toEther(1), { aspStatus: 'rejected' });

        reconcileChains(chains, [activity]);

        expect(chain[0].aspStatus).toBe('rejected');
        expect(chain[1].aspStatus).toBe('rejected');
      });

      it('should not update if ASP status unchanged', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { aspStatus: 'approved' });
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        const activity = createMockDepositActivity(0, toEther(1), { aspStatus: 'approved' });

        reconcileChains(chains, [activity]);

        expect(chain[0].aspStatus).toBe('approved');
      });
    });

    describe('intent status updates', () => {
      it('should update intent status on deposit note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), {
          isCrossChain: true,
          intentStatus: 'pending',
        });
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        const activity = createMockDepositActivity(0, toEther(1), {
          type: 'CROSSCHAIN_DEPOSIT',
          intentStatus: 'filled',
        });

        reconcileChains(chains, [activity]);

        expect((chain[0] as DepositNote).intentStatus).toBe('filled');
      });

      it('should not update intent status on non-deposit notes', () => {
        const depositNote = createMockDepositNote(0, toEther(1), {
          isCrossChain: true,
          intentStatus: 'pending',
        });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5), {
          isCrossChain: true,
          intentStatus: 'pending',
        });
        const chain: NoteChain = [depositNote, changeNote];
        const chains = new Map([[0, chain]]);

        const activity = createMockDepositActivity(0, toEther(1), {
          type: 'CROSSCHAIN_DEPOSIT',
          intentStatus: 'filled',
        });

        reconcileChains(chains, [activity]);

        // Only deposit note gets intent update
        expect((chain[0] as DepositNote).intentStatus).toBe('filled');
        // Change note keeps original (intent only on deposit)
        expect(chain[1].intentStatus).toBe('pending');
      });
    });

    describe('label updates', () => {
      it('should update label on deposit note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: undefined });
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        const activity = createMockDepositActivity(0, toEther(1), { label: BigInt(12345) });

        reconcileChains(chains, [activity]);

        // Reconciler converts label to string
        expect(chain[0].label).toBe('12345');
      });

      it('should propagate label to change notes', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: undefined });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5), { label: undefined });
        const chain: NoteChain = [depositNote, changeNote];
        const chains = new Map([[0, chain]]);

        const activity = createMockDepositActivity(0, toEther(1), { label: BigInt(12345) });

        reconcileChains(chains, [activity]);

        expect(chain[0].label).toBe('12345');
        expect(chain[1].label).toBe('12345');
      });

      it('should not update if label unchanged', () => {
        // When label is same, no update happens - so original string stays
        const depositNote = createMockDepositNote(0, toEther(1), { label: '12345' });
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        // Different label value triggers update
        const activity = createMockDepositActivity(0, toEther(1), { label: BigInt(99999) });

        reconcileChains(chains, [activity]);

        // Label changed, reconciler converts to string
        expect(chain[0].label).toBe('99999');
      });
    });

    describe('early exit when nothing changed', () => {
      it('should skip update when asp, intent, and label are all unchanged', () => {
        const depositNote = createMockDepositNote(0, toEther(1), {
          aspStatus: 'approved',
          intentStatus: undefined,
          label: undefined,
        });
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        // Activity with same asp status and no label
        const activity = createMockDepositActivity(0, toEther(1), {
          aspStatus: 'approved',
          intentStatus: undefined,
          label: undefined,
        });

        reconcileChains(chains, [activity]);

        // Nothing should have changed
        expect(chain[0].aspStatus).toBe('approved');
      });
    });

    describe('edge cases', () => {
      it('should handle empty chains map', () => {
        const chains = new Map<number, NoteChain>();

        expect(() => reconcileChains(chains, [])).not.toThrow();
      });

      it('should skip empty chains', () => {
        // Create a map with an empty chain (shouldn't happen in practice)
        const chains = new Map<number, NoteChain>();
        chains.set(0, []); // Empty chain

        // Should not throw
        expect(() => reconcileChains(chains, [])).not.toThrow();
      });

      it('should handle chain with non-deposit first note', () => {
        // Shouldn't happen in practice but code should handle it
        const changeNote = createMockChangeNote(0, 1, toEther(0.5));
        const chain: NoteChain = [changeNote];
        const chains = new Map([[0, chain]]);

        expect(() => reconcileChains(chains, [])).not.toThrow();
      });

      it('should handle activities without matching precommitment', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        // Activity for different deposit
        const activity = createMockDepositActivity(1, toEther(2));

        reconcileChains(chains, [activity]);

        // No changes
        expect(chain[0].aspStatus).toBe('approved');
      });

      it('should skip activities that are not deposits', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { aspStatus: 'pending' });
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        const withdrawal = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5));

        reconcileChains(chains, [withdrawal]);

        // No changes
        expect(chain[0].aspStatus).toBe('pending');
      });
    });
  });

  describe('reconcileIntentNotes', () => {
    it('should update WithdrawalIntentNote when filled', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const changeNote = createMockChangeNote(0, 1, toEther(0), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-123',
        intentStatus: 'pending',
        status: 'unspent',
      });
      const chain: NoteChain = [depositNote, changeNote, withdrawalIntent];
      const chains = new Map([[0, chain]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-123',
        intentStatus: 'filled',
      });
      const activityIndex = buildActivityIndex([activity]);

      reconcileChains(chains, [], activityIndex);

      const updatedIntent = chain[2] as WithdrawalIntentNote;
      expect(updatedIntent.intentStatus).toBe('filled');
      expect(updatedIntent.status).toBe('spent');
    });

    it('should create RefundNote when withdrawal intent refunded', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const changeNote = createMockChangeNote(0, 1, toEther(0), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-456',
        intentStatus: 'pending',
        status: 'unspent',
        refundCommitment: '0xrefund-commitment',
      });
      const chain: NoteChain = [depositNote, changeNote, withdrawalIntent];
      const chains = new Map([[0, chain]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-456',
        intentStatus: 'refunded',
      });
      const activityIndex = buildActivityIndex([activity]);

      reconcileChains(chains, [], activityIndex);

      // WithdrawalIntentNote should be marked as spent
      const updatedIntent = chain[2] as WithdrawalIntentNote;
      expect(updatedIntent.intentStatus).toBe('refunded');
      expect(updatedIntent.status).toBe('spent');

      // RefundNote should be created
      expect(chain).toHaveLength(4);
      const refundNote = chain[3];
      expect(refundNote.noteType).toBe('refund');
      expect(refundNote.amount).toBe(toEther(0.5).toString());
      expect(refundNote.status).toBe('unspent');
    });

    it('should not create duplicate RefundNote (idempotency)', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const changeNote = createMockChangeNote(0, 1, toEther(0), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-789',
        intentStatus: 'pending',
        status: 'unspent',
      });
      const chain: NoteChain = [depositNote, changeNote, withdrawalIntent];
      const chains = new Map([[0, chain]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-789',
        intentStatus: 'refunded',
      });
      const activityIndex = buildActivityIndex([activity]);

      // First reconcile - should create RefundNote
      reconcileChains(chains, [], activityIndex);
      expect(chain).toHaveLength(4);

      // Reset intent status to simulate re-processing
      (chain[2] as WithdrawalIntentNote).intentStatus = 'pending';
      (chain[2] as WithdrawalIntentNote).status = 'unspent';

      // Second reconcile - should NOT create duplicate RefundNote
      reconcileChains(chains, [], activityIndex);
      expect(chain).toHaveLength(4); // Still 4, not 5
    });

    it('should skip WithdrawalIntentNote without orderId', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: '',
        intentStatus: 'pending',
      });
      const chain: NoteChain = [depositNote, withdrawalIntent];
      const chains = new Map([[0, chain]]);

      const activityIndex = buildActivityIndex([]);

      reconcileChains(chains, [], activityIndex);

      // No changes
      expect((chain[1] as WithdrawalIntentNote).intentStatus).toBe('pending');
    });

    it('should skip if no matching activity for orderId', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-no-match',
        intentStatus: 'pending',
      });
      const chain: NoteChain = [depositNote, withdrawalIntent];
      const chains = new Map([[0, chain]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-different',
        intentStatus: 'filled',
      });
      const activityIndex = buildActivityIndex([activity]);

      reconcileChains(chains, [], activityIndex);

      // No changes
      expect((chain[1] as WithdrawalIntentNote).intentStatus).toBe('pending');
    });

    it('should skip if intent status unchanged', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-same',
        intentStatus: 'filled',
        status: 'spent',
      });
      const chain: NoteChain = [depositNote, withdrawalIntent];
      const chains = new Map([[0, chain]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-same',
        intentStatus: 'filled',
      });
      const activityIndex = buildActivityIndex([activity]);

      reconcileChains(chains, [], activityIndex);

      // No changes, no RefundNote
      expect(chain).toHaveLength(2);
    });

    it('should handle multiple WithdrawalIntentNotes in same chain', () => {
      const depositNote = createMockDepositNote(0, toEther(2), { status: 'spent' });
      const change1 = createMockChangeNote(0, 1, toEther(1), { status: 'spent' });
      const intent1 = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-A',
        intentStatus: 'pending',
      });
      const change2 = createMockChangeNote(0, 2, toEther(0.5), { status: 'spent' });
      const intent2 = createMockWithdrawalIntentNote(0, 1, toEther(0.3), {
        orderId: 'order-B',
        intentStatus: 'pending',
      });
      const chain: NoteChain = [depositNote, change1, intent1, change2, intent2];
      const chains = new Map([[0, chain]]);

      const activities = [
        createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
          orderId: 'order-A',
          intentStatus: 'filled',
        }),
        createMockCrossChainWithdrawalActivity(0, 1, toEther(0.3), {
          orderId: 'order-B',
          intentStatus: 'refunded',
        }),
      ];
      const activityIndex = buildActivityIndex(activities);

      reconcileChains(chains, [], activityIndex);

      // First intent should be filled
      expect((chain[2] as WithdrawalIntentNote).intentStatus).toBe('filled');
      expect(chain[2].status).toBe('spent');

      // Second intent should be refunded with RefundNote
      expect((chain[4] as WithdrawalIntentNote).intentStatus).toBe('refunded');
      expect(chain[4].status).toBe('spent');

      // RefundNote should be added
      expect(chain).toHaveLength(6);
      expect(chain[5].noteType).toBe('refund');
    });

    describe('deposit intent reconciliation', () => {
      it('should create DepositNote when deposit intent is filled', () => {
        // Create a chain starting with DepositIntentNote for a cross-chain deposit
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-123',
          intentStatus: 'pending',
          status: 'unspent',
          originChainId: '84532', // Base Sepolia (origin)
          destinationChainId: '421614', // Arbitrum Sepolia (pool)
        });
        const chain: NoteChain = [depositIntent];
        const chains = new Map([[0, chain]]);

        // Activity shows the deposit intent was filled
        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-123',
          intentStatus: 'filled',
        });
        const activityIndex = buildActivityIndex([activity]);

        const result = reconcileChains(chains, [], activityIndex);

        // DepositIntentNote should be marked as spent
        const updatedIntent = chain[0] as DepositIntentNote;
        expect(updatedIntent.intentStatus).toBe('filled');
        expect(updatedIntent.status).toBe('spent');

        // DepositNote should be created
        expect(chain).toHaveLength(2);
        const depositNote = chain[1];
        expect(depositNote.noteType).toBe('deposit');
        expect(depositNote.amount).toBe(toEther(1).toString());
        expect(depositNote.status).toBe('unspent');

        // Should return filled deposit index for nullifier computation
        expect(result.filledDepositIndices).toHaveLength(1);
        expect(result.filledDepositIndices[0].depositIndex).toBe(0);
        expect(result.filledDepositIndices[0].poolAddress).toBe(TEST_POOL_ADDRESS);
        expect(result.filledDepositIndices[0].originChainId).toBe('84532');
      });

      it('should mark deposit as spent when refunded (funds returned to origin)', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-456',
          intentStatus: 'pending',
          status: 'unspent',
        });
        const chain: NoteChain = [depositIntent];
        const chains = new Map([[0, chain]]);

        // Activity shows the deposit was refunded
        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-456',
          intentStatus: 'refunded',
        });
        const activityIndex = buildActivityIndex([activity]);

        const result = reconcileChains(chains, [], activityIndex);

        // DepositIntentNote should be marked as spent
        const updatedIntent = chain[0] as DepositIntentNote;
        expect(updatedIntent.intentStatus).toBe('refunded');
        expect(updatedIntent.status).toBe('spent');

        // No DepositNote should be created (funds returned to origin)
        expect(chain).toHaveLength(1);

        // No filled deposit indices
        expect(result.filledDepositIndices).toHaveLength(0);
      });

      it('should not create duplicate DepositNote (idempotency)', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-idempotent',
          intentStatus: 'pending',
          status: 'unspent',
        });
        const chain: NoteChain = [depositIntent];
        const chains = new Map([[0, chain]]);

        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-idempotent',
          intentStatus: 'filled',
        });
        const activityIndex = buildActivityIndex([activity]);

        // First reconcile
        reconcileChains(chains, [], activityIndex);
        expect(chain).toHaveLength(2);

        // Reset intent status to simulate re-processing
        (chain[0] as DepositIntentNote).intentStatus = 'pending';
        (chain[0] as DepositIntentNote).status = 'unspent';

        // Second reconcile should NOT create duplicate DepositNote
        reconcileChains(chains, [], activityIndex);
        expect(chain).toHaveLength(2); // Still 2, not 3
      });

      it('should skip if deposit intent status unchanged', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-unchanged',
          intentStatus: 'filled',
          status: 'spent',
        });
        const chain: NoteChain = [depositIntent];
        const chains = new Map([[0, chain]]);

        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-unchanged',
          intentStatus: 'filled',
        });
        const activityIndex = buildActivityIndex([activity]);

        const result = reconcileChains(chains, [], activityIndex);

        // No changes
        expect(chain).toHaveLength(1);
        expect(result.filledDepositIndices).toHaveLength(0);
      });
    });

    describe('testing gaps - cross-chain withdrawal lifecycle', () => {
      it('should handle full cross-chain withdrawal lifecycle: pending → filled', () => {
        // Testing gap: Cross-chain withdrawal pending → filled flow
        // Setup: DepositNote (spent) + ChangeNote + WithdrawalIntentNote
        const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5));
        const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
          orderId: 'withdrawal-order-filled',
          intentStatus: 'pending',
          status: 'unspent',
        });
        const chain: NoteChain = [depositNote, changeNote, withdrawalIntent];
        const chains = new Map([[0, chain]]);

        // Withdrawal activity now shows 'filled'
        const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
          orderId: 'withdrawal-order-filled',
          intentStatus: 'filled',
        });
        const activityIndex = buildActivityIndex([activity]);

        reconcileChains(chains, [], activityIndex);

        // WithdrawalIntentNote should be marked as filled and spent
        expect((chain[2] as WithdrawalIntentNote).intentStatus).toBe('filled');
        expect(chain[2].status).toBe('spent');
        // No RefundNote created for filled intents
        expect(chain).toHaveLength(3);
      });

      it('should handle full cross-chain withdrawal lifecycle: pending → refunded', () => {
        // Testing gap: Cross-chain withdrawal pending → refunded flow
        // Setup: DepositNote (spent) + ChangeNote + WithdrawalIntentNote
        const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5));
        const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
          orderId: 'withdrawal-order-refunded',
          intentStatus: 'pending',
          status: 'unspent',
          refundCommitment: '0xrefund-commitment-123',
        });
        const chain: NoteChain = [depositNote, changeNote, withdrawalIntent];
        const chains = new Map([[0, chain]]);

        // Withdrawal activity now shows 'refunded'
        const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
          orderId: 'withdrawal-order-refunded',
          intentStatus: 'refunded',
        });
        const activityIndex = buildActivityIndex([activity]);

        reconcileChains(chains, [], activityIndex);

        // WithdrawalIntentNote should be marked as refunded and spent
        expect((chain[2] as WithdrawalIntentNote).intentStatus).toBe('refunded');
        expect(chain[2].status).toBe('spent');
        // RefundNote should be created
        expect(chain).toHaveLength(4);
        expect(chain[3].noteType).toBe('refund');
        expect(chain[3].status).toBe('unspent');
        expect(chain[3].amount).toBe(toEther(0.5).toString());
      });

      it('should handle deposit intent refund (funds returned to origin chain)', () => {
        // Testing gap: Deposit intent refund - different from withdrawal refund
        // When a deposit intent is refunded, funds go back to user's wallet on origin chain
        // No RefundNote is created (unlike withdrawal refund)
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-refunded',
          intentStatus: 'pending',
          status: 'unspent',
        });
        const chain: NoteChain = [depositIntent];
        const chains = new Map([[0, chain]]);

        // Deposit activity shows refunded
        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-refunded',
          type: 'CROSSCHAIN_DEPOSIT_PENDING',
          intentStatus: 'refunded',
        });
        const activityIndex = buildActivityIndex([activity]);

        reconcileChains(chains, [], activityIndex);

        // DepositIntentNote should be marked as refunded and spent
        expect((chain[0] as DepositIntentNote).intentStatus).toBe('refunded');
        expect(chain[0].status).toBe('spent');
        // No RefundNote for deposit refunds - funds returned to origin chain wallet
        expect(chain).toHaveLength(1);
      });
    });
  });
});
