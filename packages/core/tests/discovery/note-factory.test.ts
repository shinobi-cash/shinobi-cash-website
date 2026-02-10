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
  createWithdrawalRefundedNote,
  createCrosschainDepositNote,
} from '../../src/discovery/note-factory.js';
import { isCrossChainNote } from '../../src/discovery/types.js';
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

      // label is stored as-is from activity (bigint)
      expect(note.label).toBe(activity.label);
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

    it('should create same-chain deposit note', () => {
      const activity = createMockDepositActivity(0, toEther(1));
      const note = createDepositNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.noteType).toBe('deposit');
      expect(isCrossChainNote(note)).toBe(false);
      expect(note.originChainId).toBe('421614');
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

    it('should set status to spent when remaining is 0', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMock1x1WithdrawalActivity(0, 0, toEther(1));
      const note = createChangeNote(parentNote, activity, 1, 0n);

      expect(note.status).toBe('spent');
      expect(note.amount).toBe('0');
    });

    it('should be same-chain note type (cross-chain tracked by sibling intent)', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
      const note = createChangeNote(parentNote, activity, 1, toEther(0.7));

      // ChangeNote is never cross-chain by type - cross-chain status is tracked by sibling
      expect(note.noteType).toBe('change');
      expect(isCrossChainNote(note)).toBe(false);
    });
  });

  describe('createWithdraw2ChangeNote', () => {
    it('should create a change note for Withdraw2 winner', () => {
      const winnerNote = createMockDepositNote(1, toEther(1));
      const loserSerialNumber = 'ARB-001-00-0-00'; // Serial number of merged note
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createWithdraw2ChangeNote(winnerNote, activity, 1, toEther(1.5), loserSerialNumber, toEther(1));

      expect(note.noteType).toBe('change');
      expect(note.depositIndex).toBe(1);
      expect(note.changeIndex).toBe(1);
      expect(note.amount).toBe(toEther(1.5).toString());
      expect(note.mergedFrom[loserSerialNumber]).toBe(toEther(1).toString());
    });

    it('should include spentNullifier1 in activity metadata', () => {
      const winnerNote = createMockDepositNote(1, toEther(1));
      const loserSerialNumber = 'ARB-001-00-0-00';
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createWithdraw2ChangeNote(winnerNote, activity, 1, toEther(1.5), loserSerialNumber, toEther(1));

      expect(note.activityData.spentNullifier1).toBe(activity.spentNullifier1);
    });

    it('should be same-chain note type (cross-chain tracked by sibling intent)', () => {
      const winnerNote = createMockDepositNote(1, toEther(1));
      const loserSerialNumber = 'ARB-001-00-0-00';
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createWithdraw2ChangeNote(winnerNote, activity, 1, toEther(1.5), loserSerialNumber, toEther(1));

      expect(note.noteType).toBe('change');
      expect(isCrossChainNote(note)).toBe(false);
    });
  });

  describe('createMergedNote', () => {
    it('should create a merged note for Withdraw2 loser chain', () => {
      const loserNote = createMockDepositNote(0, toEther(1));
      const winnerSerialNumber = 'ARB-002-01-0-00'; // Serial number of winner note
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createMergedNote(loserNote, activity, winnerSerialNumber);

      expect(note.noteType).toBe('merged');
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(0); // Keeps loser's changeIndex
      expect(note.amount).toBe('0'); // Terminal notes have no remaining balance
      expect(note.contributedAmount).toBe(toEther(1).toString()); // Keeps loser's amount for record
      expect(note.mergedIntoSerialNumber).toBe(winnerSerialNumber);
    });

    it('should preserve loser note serial number', () => {
      const loserNote = createMockDepositNote(0, toEther(1));
      const winnerSerialNumber = 'ARB-002-01-0-00';
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createMergedNote(loserNote, activity, winnerSerialNumber);

      expect(note.serialNumber).toBe(loserNote.serialNumber);
    });

    it('should be same-chain note type (cross-chain tracked by sibling intent)', () => {
      const loserNote = createMockDepositNote(0, toEther(1));
      const winnerSerialNumber = 'ARB-002-01-0-00';
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const note = createMergedNote(loserNote, activity, winnerSerialNumber);

      expect(note.noteType).toBe('merged');
      expect(isCrossChainNote(note)).toBe(false);
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
      expect(note.amount).toBe(toEther(0.5).toString());
      expect(isCrossChainNote(note)).toBe(true);
    });

    it('should set intent fields from activity', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-xyz',
        fillDeadline: BigInt(1234567890),
        expires: BigInt(1234567999),
        refundCommitment: '0xrefund123',
      });
      const note = createWithdrawalIntentNote(parentNote, activity, 0);

      expect(note.orderId).toBe('order-xyz');
      expect(note.fillDeadline).toBe('1234567890');
      expect(note.expires).toBe('1234567999');
      expect(note.refundCommitment).toBe('0xrefund123');
    });

    it('should set destination chain from activity', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5));
      const note = createWithdrawalIntentNote(parentNote, activity, 0);

      expect(note.destinationChainId).toBe('84532');
    });

    it('should use orderId from activity', () => {
      const parentNote = createMockDepositNote(0, toEther(1));
      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'test-order-123',
      });
      const note = createWithdrawalIntentNote(parentNote, activity, 0);

      expect(note.orderId).toBe('test-order-123');
    });
  });

  describe('createWithdrawalRefundedNote', () => {
    it('should create a refund note from pending intent', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5));
      const note = createWithdrawalRefundedNote(pendingIntent, 'test-label', 'approved');

      expect(note.noteType).toBe('withdrawalRefunded');
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(0);
      expect(note.amount).toBe(toEther(0.5).toString());
      expect(note.status).toBe('unspent');
    });

    it('should copy refundCommitment from pending intent', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        refundCommitment: '0xrefund-abc',
      });
      const note = createWithdrawalRefundedNote(pendingIntent, 'test-label', 'approved');

      expect(note.refundCommitment).toBe('0xrefund-abc');
    });

    it('should use provided label and aspStatus', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5));
      const note = createWithdrawalRefundedNote(pendingIntent, 'my-label', 'pending');

      expect(note.label).toBe('my-label');
      expect(note.aspStatus).toBe('pending');
    });

    it('should be considered cross-chain note (refund from cross-chain withdrawal)', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5));
      const note = createWithdrawalRefundedNote(pendingIntent, 'test-label', 'approved');

      expect(note.noteType).toBe('withdrawalRefunded');
      // WithdrawalRefundedNote is considered cross-chain because it originated from a cross-chain withdrawal intent
      expect(isCrossChainNote(note)).toBe(true);
    });

    it('should set originChainId from intent', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        originChainId: '421614', // Pool chain
      });
      const note = createWithdrawalRefundedNote(pendingIntent, 'test-label', 'approved');

      expect(note.originChainId).toBe('421614');
    });

    it('should copy activityData from pending intent', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        activityData: { recipient: '0xrecipient123' },
      });
      const note = createWithdrawalRefundedNote(pendingIntent, 'test-label', 'approved');

      expect(note.activityData.recipient).toBe('0xrecipient123');
    });

    it('should use originTransactionHash from intent note', () => {
      const pendingIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        originTransactionHash: '0xorigin',
      });
      const note = createWithdrawalRefundedNote(pendingIntent, 'test-label', 'approved');

      expect(note.originTransactionHash).toBe('0xorigin');
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
      expect(isCrossChainNote(note)).toBe(true);
    });

    it('should set orderId from activity', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1), {
        orderId: 'test-order-123',
      });
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.orderId).toBe('test-order-123');
    });

    it('should set chainIds correctly', () => {
      const activity = createMockPendingCrossChainDepositActivity(0, toEther(1));
      const note = createDepositIntentNote(activity, 0, TEST_POOL_ADDRESS);

      expect(note.originChainId).toBe('421614'); // Arbitrum Sepolia (origin)
      expect(note.destinationChainId).toBe('84532'); // Base Sepolia (pool/fill chain)
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
  });
});
