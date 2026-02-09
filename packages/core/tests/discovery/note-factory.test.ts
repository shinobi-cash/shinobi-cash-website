/**
 * Tests for note-factory.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDepositNote,
  createChangeNote,
  createWithdraw2ChangeNote,
  createMergedNote,
  createWithdrawalIntentNote,
  createDepositIntentNote,
  createRefundNote,
} from '../../src/discovery/note-factory.js';
import {
  createMockDepositActivity,
  createMockCrossChainDepositActivity,
  createMockPendingCrossChainDepositActivity,
  createMock1x1WithdrawalActivity,
  createMockCrossChainWithdrawalActivity,
  createMockWithdraw2Activity,
  createMockDepositNote,
  createMockChangeNote,
  createMockWithdrawalIntentNote,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  toEther,
} from './fixtures.js';

describe('note-factory', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  describe('createDepositNote', () => {
    it('should create a deposit note with correct fields', () => {
      const activity = createMockDepositActivity(0, toEther(1));
      const note = createDepositNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.noteType).toBe('deposit');
      expect(note.poolAddress).toBe(TEST_POOL_ADDRESS);
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(0);
      expect(note.amount).toBe(toEther(1).toString());
      expect(note.status).toBe('unspent');
      expect(note.aspStatus).toBe('approved');
    });

    it('should set label from activity', () => {
      const activity = createMockDepositActivity(5, toEther(1));
      const note = createDepositNote(activity, 5, TEST_POOL_ADDRESS);

      expect(note.label).toBe('1005'); // depositIndex + 1000 from fixture
    });

    it('should handle undefined label', () => {
      const activity = createMockDepositActivity(0, toEther(1), { label: undefined });
      const note = createDepositNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.label).toBeUndefined();
    });

    it('should set precommitmentHash from activity', () => {
      const activity = createMockDepositActivity(0, toEther(1));
      const note = createDepositNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.precommitmentHash).toBe(activity.precommitmentHash);
    });

    it('should throw if activity has no precommitmentHash', () => {
      const activity = createMockDepositActivity(0, toEther(1));
      activity.precommitmentHash = undefined;

      expect(() => createDepositNote(activity, 0, TEST_POOL_ADDRESS)).toThrow(
        'Activity must have precommitmentHash',
      );
    });

    it('should detect same-chain deposit', () => {
      const activity = createMockDepositActivity(0, toEther(1));
      const note = createDepositNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.isCrossChain).toBe(false);
      expect(note.originChainId).toBe('421614');
      expect(note.destinationChainId).toBe('421614');
    });

    it('should detect cross-chain deposit', () => {
      const activity = createMockCrossChainDepositActivity(0, toEther(1));
      const note = createDepositNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.isCrossChain).toBe(true);
      expect(note.originChainId).toBe('421614');
      expect(note.destinationChainId).toBe('84532');
    });

    it('should set intent fields for cross-chain deposit', () => {
      const activity = createMockCrossChainDepositActivity(0, toEther(1), {
        intentStatus: 'pending',
        orderId: 'order-123',
        fillDeadline: BigInt(1234567890),
        expires: BigInt(1234567999),
      });
      const note = createDepositNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.intentStatus).toBe('pending');
      expect(note.orderId).toBe('order-123');
      expect(note.fillDeadline).toBe('1234567890');
      expect(note.expires).toBe('1234567999');
    });

    it('should store discoveredAtOffset if provided', () => {
      const activity = createMockDepositActivity(0, toEther(1));
      const note = createDepositNote(activity, 0, TEST_POOL_ADDRESS, 42);

      expect(note.discoveredAtOffset).toBe(42);
    });

    it('should build activity metadata', () => {
      const activity = createMockDepositActivity(0, toEther(1), {
        originalAmount: BigInt(toEther(1)),
        vettingFeeAmount: BigInt(1000),
        relayFeeAmount: BigInt(2000),
        recipient: '0xrecipient',
      });
      const note = createDepositNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.activityData.originalAmount).toBe(toEther(1).toString());
      expect(note.activityData.vettingFeeAmount).toBe('1000');
      expect(note.activityData.relayFeeAmount).toBe('2000');
      expect(note.activityData.recipient).toBe('0xrecipient');
    });
  });

  describe('createChangeNote', () => {
    it('should create a change note with correct fields', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
      const note = createChangeNote(parentNote, activity, 1, toEther(0.7));

      expect(note.noteType).toBe('change');
      expect(note.poolAddress).toBe(TEST_POOL_ADDRESS);
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(1);
      expect(note.amount).toBe(toEther(0.7).toString());
      expect(note.status).toBe('unspent');
    });

    it('should inherit label from parent note', () => {
      const parentNote = createMockDepositNote(0, toEther(1), { label: 'my-label' });
      const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
      const note = createChangeNote(parentNote, activity, 1, toEther(0.7));

      expect(note.label).toBe('my-label');
    });

    it('should inherit aspStatus from parent note', () => {
      const parentNote = createMockDepositNote(0, toEther(1), { aspStatus: 'pending' });
      const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
      const note = createChangeNote(parentNote, activity, 1, toEther(0.7));

      expect(note.aspStatus).toBe('pending');
    });

    it('should inherit isCrossChain from parent note', () => {
      const parentNote = createMockDepositNote(0, toEther(1), { isCrossChain: true });
      const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
      const note = createChangeNote(parentNote, activity, 1, toEther(0.7));

      expect(note.isCrossChain).toBe(true);
    });

    it('should set status to spent when remaining is 0', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMock1x1WithdrawalActivity(0, 0, toEther(1));
      const note = createChangeNote(parentNote, activity, 1, 0n);

      expect(note.status).toBe('spent');
      expect(note.amount).toBe('0');
    });

    it('should store refundCommitment from activity', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.3));
      const note = createChangeNote(parentNote, activity, 1, toEther(0.7));

      expect(note.refundCommitment).toBe(activity.refundCommitment);
    });

    it('should set intentStatus for cross-chain withdrawals', () => {
      const parentNote = createMockDepositNote(0, toEther(1), { isCrossChain: true });
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.3), {
        intentStatus: 'pending',
      });
      const note = createChangeNote(parentNote, activity, 1, toEther(0.7));

      expect(note.intentStatus).toBe('pending');
    });

    it('should default intentStatus to filled for cross-chain', () => {
      const parentNote = createMockDepositNote(0, toEther(1), { isCrossChain: true });
      const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3), {
        intentStatus: undefined,
      });
      const note = createChangeNote(parentNote, activity, 1, toEther(0.7));

      expect(note.intentStatus).toBe('filled');
    });
  });

  describe('createWithdraw2ChangeNote', () => {
    it('should create a change note for Withdraw2 winner', () => {
      const winnerNote = createMockDepositNote(1, toEther(1));
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createWithdraw2ChangeNote(winnerNote, activity, 1, toEther(1.5), 0, '421614', toEther(1));

      expect(note.noteType).toBe('change');
      expect(note.depositIndex).toBe(1);
      expect(note.changeIndex).toBe(1);
      expect(note.amount).toBe(toEther(1.5).toString());
      expect(note.mergedFromDepositIndex).toBe(0);
      expect(note.mergedFromOriginChainId).toBe('421614');
      expect(note.mergedFromAmount).toBe(toEther(1).toString());
    });

    it('should detect cross-chain from activity type', () => {
      const winnerNote = createMockDepositNote(1, toEther(1), { isCrossChain: false });
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5), {
        type: 'CROSSCHAIN_WITHDRAW2',
      });
      const note = createWithdraw2ChangeNote(winnerNote, activity, 1, toEther(1.5), 0, '421614', toEther(1));

      expect(note.isCrossChain).toBe(true);
    });

    it('should detect cross-chain from parent note', () => {
      const winnerNote = createMockDepositNote(1, toEther(1), { isCrossChain: true });
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createWithdraw2ChangeNote(winnerNote, activity, 1, toEther(1.5), 0, '421614', toEther(1));

      expect(note.isCrossChain).toBe(true);
    });

    it('should include spentNullifier1 in activity metadata', () => {
      const winnerNote = createMockDepositNote(1, toEther(1));
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createWithdraw2ChangeNote(winnerNote, activity, 1, toEther(1.5), 0, '421614', toEther(1));

      expect(note.activityData.spentNullifier1).toBe(activity.spentNullifier1);
    });

    it('should use orderId from activity if present', () => {
      const winnerNote = createMockDepositNote(1, toEther(1), { orderId: 'parent-order' });
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5), {
        orderId: 'activity-order',
      });
      const note = createWithdraw2ChangeNote(winnerNote, activity, 1, toEther(1.5), 0, '421614', toEther(1));

      expect(note.orderId).toBe('activity-order');
    });

    it('should fall back to parent orderId if activity has none', () => {
      const winnerNote = createMockDepositNote(1, toEther(1), { orderId: 'parent-order' });
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5), {
        orderId: undefined,
      });
      const note = createWithdraw2ChangeNote(winnerNote, activity, 1, toEther(1.5), 0, '421614', toEther(1));

      expect(note.orderId).toBe('parent-order');
    });
  });

  describe('createMergedNote', () => {
    it('should create a merged note for Withdraw2 loser chain', () => {
      const loserNote = createMockDepositNote(0, toEther(1));
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createMergedNote(loserNote, activity, 1, 1);

      expect(note.noteType).toBe('change');
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(1);
      expect(note.amount).toBe('0'); // Merged notes have 0 balance
      expect(note.status).toBe('merged');
      expect(note.mergedIntoDepositIndex).toBe(1);
    });

    it('should inherit label from loser note', () => {
      const loserNote = createMockDepositNote(0, toEther(1), { label: 'loser-label' });
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createMergedNote(loserNote, activity, 1, 1);

      expect(note.label).toBe('loser-label');
    });

    it('should detect cross-chain from activity type', () => {
      const loserNote = createMockDepositNote(0, toEther(1));
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5), {
        type: 'CROSSCHAIN_WITHDRAW2_PENDING',
      });
      const note = createMergedNote(loserNote, activity, 1, 1);

      expect(note.isCrossChain).toBe(true);
    });
  });

  describe('createWithdrawalIntentNote', () => {
    it('should create a withdrawal intent note', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5));
      const note = createWithdrawalIntentNote(parentNote, activity, 0);

      expect(note.noteType).toBe('withdrawalIntent');
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(0);
      expect(note.parentChangeIndex).toBe(0);
      expect(note.amount).toBe(toEther(0.5).toString());
      expect(note.status).toBe('unspent');
      expect(note.isCrossChain).toBe(true);
    });

    it('should set intent fields from activity', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-xyz',
        intentStatus: 'pending',
        fillDeadline: BigInt(1234567890),
        expires: BigInt(1234567999),
        refundCommitment: '0xrefund123',
      });
      const note = createWithdrawalIntentNote(parentNote, activity, 0);

      expect(note.orderId).toBe('order-xyz');
      expect(note.intentStatus).toBe('pending');
      expect(note.fillDeadline).toBe('1234567890');
      expect(note.expires).toBe('1234567999');
      expect(note.refundCommitment).toBe('0xrefund123');
    });

    it('should inherit label and aspStatus from parent', () => {
      const parentNote = createMockDepositNote(0, toEther(1), {
        label: 'parent-label',
        aspStatus: 'pending',
      });
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5));
      const note = createWithdrawalIntentNote(parentNote, activity, 0);

      expect(note.label).toBe('parent-label');
      expect(note.aspStatus).toBe('pending');
    });

    it('should handle missing orderId', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: undefined,
      });
      const note = createWithdrawalIntentNote(parentNote, activity, 0);

      // Factory uses empty string as fallback for missing orderId
      expect(note.orderId).toBe('');
    });

    it('should default intentStatus to pending', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        intentStatus: undefined,
      });
      const note = createWithdrawalIntentNote(parentNote, activity, 0);

      expect(note.intentStatus).toBe('pending');
    });
  });

  describe('createRefundNote', () => {
    it('should create a refund note from pending intent', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5));
      const note = createRefundNote(pendingIntent);

      expect(note.noteType).toBe('refund');
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(0);
      expect(note.refundIndex).toBe(0);
      expect(note.amount).toBe(toEther(0.5).toString());
      expect(note.status).toBe('unspent');
    });

    it('should copy refundCommitment from pending intent', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        refundCommitment: '0xrefund-abc',
      });
      const note = createRefundNote(pendingIntent);

      expect(note.refundCommitment).toBe('0xrefund-abc');
    });

    it('should inherit label and aspStatus', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        label: 'intent-label',
        aspStatus: 'pending',
      });
      const note = createRefundNote(pendingIntent);

      expect(note.label).toBe('intent-label');
      expect(note.aspStatus).toBe('pending');
    });

    it('should set isCrossChain to false (refund is on pool chain)', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5));
      const note = createRefundNote(pendingIntent);

      expect(note.isCrossChain).toBe(false);
    });

    it('should set destinationChainId to originChainId', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        originChainId: '421614',
        destinationChainId: '84532',
      });
      const note = createRefundNote(pendingIntent);

      expect(note.originChainId).toBe('421614');
      expect(note.destinationChainId).toBe('421614'); // Back to pool chain
    });

    it('should accept custom refundIndex', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5));
      const note = createRefundNote(pendingIntent, 3);

      expect(note.refundIndex).toBe(3);
    });

    it('should copy orderId for idempotency', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-for-idempotency',
      });
      const note = createRefundNote(pendingIntent);

      expect(note.orderId).toBe('order-for-idempotency');
    });

    it('should copy activityData from pending intent', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        activityData: { recipient: '0xrecipient123' },
      });
      const note = createRefundNote(pendingIntent);

      expect(note.activityData.recipient).toBe('0xrecipient123');
    });

    it('should use originTransactionHash for both transaction fields', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        originTransactionHash: '0xorigin',
        destinationTransactionHash: '0xdest',
      });
      const note = createRefundNote(pendingIntent);

      expect(note.originTransactionHash).toBe('0xorigin');
      expect(note.destinationTransactionHash).toBe('0xorigin'); // Refund is on pool chain
    });
  });

  describe('createDepositIntentNote', () => {
    it('should create a pending intent note for cross-chain deposit', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1));
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.noteType).toBe('depositIntent');
      expect(note.poolAddress).toBe(TEST_POOL_ADDRESS);
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(0);
      expect(note.amount).toBe(toEther(1).toString());
      expect(note.status).toBe('unspent');
      expect(note.isCrossChain).toBe(true);
    });

    it('should set intentStatus from activity', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1), {
        intentStatus: 'pending',
      });
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.intentStatus).toBe('pending');
    });

    it('should default intentStatus to pending when undefined', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1), {
        intentStatus: undefined,
      });
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.intentStatus).toBe('pending');
    });

    it('should set orderId from activity', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1), {
        orderId: 'test-order-123',
      });
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.orderId).toBe('test-order-123');
    });

    it('should default orderId to empty string when undefined', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1), {
        orderId: undefined,
      });
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.orderId).toBe('');
    });

    it('should set chainIds correctly', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1));
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.originChainId).toBe('421614'); // Arbitrum Sepolia
      expect(note.destinationChainId).toBe('84532'); // Base Sepolia
    });

    it('should set fillDeadline and expires from activity', () => {
      const fillDeadline = BigInt(Date.now() + 3600000);
      const expires = BigInt(Date.now() + 7200000);
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1), {
        fillDeadline,
        expires,
      });
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.fillDeadline).toBe(fillDeadline.toString());
      expect(note.expires).toBe(expires.toString());
    });

    it('should set discoveredAtOffset when provided', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1));
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS, 42);

      expect(note.discoveredAtOffset).toBe(42);
    });

    it('should set aspStatus from activity', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1), {
        aspStatus: 'pending',
      });
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.aspStatus).toBe('pending');
    });

    it('should set label as string when provided', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1), {
        label: BigInt(12345),
      });
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.label).toBe('12345');
    });

    it('should handle undefined label', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1), {
        label: undefined,
      });
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.label).toBeUndefined();
    });
  });
});
