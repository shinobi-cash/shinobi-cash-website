/**
 * Tests for activity-indexer.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Activity } from '@shinobi-cash/data';
import {
  buildActivityIndex,
  isDepositActivity,
  is1x1WithdrawalActivity,
  isWithdraw2Activity,
  isRagequitActivity,
} from '../../src/discovery/activity-indexer.js';
import {
  createMockDepositActivity,
  createMockCrossChainDepositActivity,
  createMock1x1WithdrawalActivity,
  createMockCrossChainWithdrawalActivity,
  createMockWithdraw2Activity,
  createMockRagequitActivity,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  TEST_ACCOUNT_KEY,
} from './fixtures.js';
import { deriveAndHashNullifier } from '../../src/discovery/nullifier-utils.js';

describe('activity-indexer', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  describe('isDepositActivity', () => {
    it('should return true for DEPOSIT type', () => {
      const activity = createMockDepositActivity(0, '1000000000000000000');
      expect(isDepositActivity(activity)).toBe(true);
    });

    it('should return true for CROSSCHAIN_DEPOSIT type', () => {
      const activity = createMockCrossChainDepositActivity(0, '1000000000000000000');
      expect(isDepositActivity(activity)).toBe(true);
    });

    it('should return true for CROSSCHAIN_DEPOSIT_PENDING type', () => {
      const activity = createMockDepositActivity(0, '1000000000000000000', {
        type: 'CROSSCHAIN_DEPOSIT_PENDING',
      });
      expect(isDepositActivity(activity)).toBe(true);
    });

    it('should return false for WITHDRAWAL type', () => {
      const activity = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
      expect(isDepositActivity(activity)).toBe(false);
    });

    it('should return false for WITHDRAW2 type', () => {
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
      expect(isDepositActivity(activity)).toBe(false);
    });

    it('should return false for RAGEQUIT type', () => {
      const activity = createMockRagequitActivity(0, 0, '0xcommitment');
      expect(isDepositActivity(activity)).toBe(false);
    });
  });

  describe('is1x1WithdrawalActivity', () => {
    it('should return true for WITHDRAWAL type', () => {
      const activity = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
      expect(is1x1WithdrawalActivity(activity)).toBe(true);
    });

    it('should return true for CROSSCHAIN_WITHDRAWAL type', () => {
      const activity = createMock1x1WithdrawalActivity(0, 0, '500000000000000000', {
        type: 'CROSSCHAIN_WITHDRAWAL',
      });
      expect(is1x1WithdrawalActivity(activity)).toBe(true);
    });

    it('should return true for CROSSCHAIN_WITHDRAWAL_PENDING type', () => {
      const activity = createMockCrossChainWithdrawalActivity(0, 0, '500000000000000000');
      expect(is1x1WithdrawalActivity(activity)).toBe(true);
    });

    it('should return false for DEPOSIT type', () => {
      const activity = createMockDepositActivity(0, '1000000000000000000');
      expect(is1x1WithdrawalActivity(activity)).toBe(false);
    });

    it('should return false for WITHDRAW2 type', () => {
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
      expect(is1x1WithdrawalActivity(activity)).toBe(false);
    });
  });

  describe('isWithdraw2Activity', () => {
    it('should return true for WITHDRAW2 type', () => {
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
      expect(isWithdraw2Activity(activity)).toBe(true);
    });

    it('should return true for CROSSCHAIN_WITHDRAW2 type', () => {
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000', {
        type: 'CROSSCHAIN_WITHDRAW2',
      });
      expect(isWithdraw2Activity(activity)).toBe(true);
    });

    it('should return true for CROSSCHAIN_WITHDRAW2_PENDING type', () => {
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000', {
        type: 'CROSSCHAIN_WITHDRAW2_PENDING',
      });
      expect(isWithdraw2Activity(activity)).toBe(true);
    });

    it('should return false for WITHDRAWAL type', () => {
      const activity = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
      expect(isWithdraw2Activity(activity)).toBe(false);
    });

    it('should return false for DEPOSIT type', () => {
      const activity = createMockDepositActivity(0, '1000000000000000000');
      expect(isWithdraw2Activity(activity)).toBe(false);
    });
  });

  describe('isRagequitActivity', () => {
    it('should return true for RAGEQUIT type', () => {
      const activity = createMockRagequitActivity(0, 0, '0xcommitment');
      expect(isRagequitActivity(activity)).toBe(true);
    });

    it('should return false for DEPOSIT type', () => {
      const activity = createMockDepositActivity(0, '1000000000000000000');
      expect(isRagequitActivity(activity)).toBe(false);
    });

    it('should return false for WITHDRAWAL type', () => {
      const activity = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
      expect(isRagequitActivity(activity)).toBe(false);
    });
  });

  describe('buildActivityIndex', () => {
    it('should return empty maps for empty activities', () => {
      const index = buildActivityIndex([]);

      expect(index.depositsByPrecommitment.size).toBe(0);
      expect(index.withdrawalsByNullifier.size).toBe(0);
      expect(index.withdraw2ByNullifier.size).toBe(0);
      expect(index.ragequitByCommitment.size).toBe(0);
      expect(index.withdrawalsByOrderId.size).toBe(0);
    });

    describe('deposit indexing', () => {
      it('should index deposits by precommitmentHash', () => {
        const deposit = createMockDepositActivity(0, '1000000000000000000');
        const index = buildActivityIndex([deposit]);

        expect(index.depositsByPrecommitment.size).toBe(1);
        expect(index.depositsByPrecommitment.get(deposit.precommitmentHash!)).toBe(deposit);
      });

      it('should index cross-chain deposits', () => {
        const deposit = createMockCrossChainDepositActivity(0, '1000000000000000000');
        const index = buildActivityIndex([deposit]);

        expect(index.depositsByPrecommitment.size).toBe(1);
        expect(index.depositsByPrecommitment.get(deposit.precommitmentHash!)).toBe(deposit);
      });

      it('should index multiple deposits', () => {
        const deposit0 = createMockDepositActivity(0, '1000000000000000000');
        const deposit1 = createMockDepositActivity(1, '2000000000000000000');
        const index = buildActivityIndex([deposit0, deposit1]);

        expect(index.depositsByPrecommitment.size).toBe(2);
        expect(index.depositsByPrecommitment.get(deposit0.precommitmentHash!)).toBe(deposit0);
        expect(index.depositsByPrecommitment.get(deposit1.precommitmentHash!)).toBe(deposit1);
      });

      it('should skip deposits without precommitmentHash', () => {
        const deposit = createMockDepositActivity(0, '1000000000000000000');
        deposit.precommitmentHash = undefined;
        const index = buildActivityIndex([deposit]);

        expect(index.depositsByPrecommitment.size).toBe(0);
      });
    });

    describe('1:1 withdrawal indexing', () => {
      it('should index 1:1 withdrawals by nullifier', () => {
        const withdrawal = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
        const index = buildActivityIndex([withdrawal]);

        expect(index.withdrawalsByNullifier.size).toBe(1);
        expect(index.withdrawalsByNullifier.get(withdrawal.spentNullifier!)).toBe(withdrawal);
      });

      it('should index cross-chain withdrawals', () => {
        const withdrawal = createMockCrossChainWithdrawalActivity(0, 0, '500000000000000000');
        const index = buildActivityIndex([withdrawal]);

        expect(index.withdrawalsByNullifier.size).toBe(1);
        expect(index.withdrawalsByNullifier.get(withdrawal.spentNullifier!)).toBe(withdrawal);
      });

      it('should index cross-chain withdrawals by orderId', () => {
        const withdrawal = createMockCrossChainWithdrawalActivity(0, 0, '500000000000000000');
        const index = buildActivityIndex([withdrawal]);

        expect(index.withdrawalsByOrderId.size).toBe(1);
        expect(index.withdrawalsByOrderId.get(withdrawal.orderId!)).toBe(withdrawal);
      });

      it('should not index regular withdrawals without orderId', () => {
        const withdrawal = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
        const index = buildActivityIndex([withdrawal]);

        expect(index.withdrawalsByOrderId.size).toBe(0);
      });

      it('should skip withdrawals without spentNullifier', () => {
        const withdrawal = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
        withdrawal.spentNullifier = undefined;
        const index = buildActivityIndex([withdrawal]);

        expect(index.withdrawalsByNullifier.size).toBe(0);
      });
    });

    describe('Withdraw2 indexing', () => {
      it('should index Withdraw2 by both nullifiers', () => {
        const withdraw2 = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
        const index = buildActivityIndex([withdraw2]);

        expect(index.withdraw2ByNullifier.size).toBe(2);
        expect(index.withdraw2ByNullifier.get(withdraw2.spentNullifier!)).toBe(withdraw2);
        expect(index.withdraw2ByNullifier.get(withdraw2.spentNullifier1!)).toBe(withdraw2);
      });

      it('should index cross-chain Withdraw2 by orderId', () => {
        const withdraw2 = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000', {
          type: 'CROSSCHAIN_WITHDRAW2',
          orderId: 'order-withdraw2',
        });
        const index = buildActivityIndex([withdraw2]);

        expect(index.withdrawalsByOrderId.size).toBe(1);
        expect(index.withdrawalsByOrderId.get('order-withdraw2')).toBe(withdraw2);
      });

      it('should skip Withdraw2 without spentNullifier', () => {
        const withdraw2 = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
        withdraw2.spentNullifier = undefined;
        const index = buildActivityIndex([withdraw2]);

        expect(index.withdraw2ByNullifier.size).toBe(0);
      });

      it('should handle Withdraw2 with only first nullifier', () => {
        const withdraw2 = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
        withdraw2.spentNullifier1 = undefined;
        const index = buildActivityIndex([withdraw2]);

        expect(index.withdraw2ByNullifier.size).toBe(1);
        expect(index.withdraw2ByNullifier.get(withdraw2.spentNullifier!)).toBe(withdraw2);
      });
    });

    describe('ragequit indexing', () => {
      it('should index ragequit by commitment', () => {
        const ragequit = createMockRagequitActivity(0, 0, '0xcommitment123');
        const index = buildActivityIndex([ragequit]);

        expect(index.ragequitByCommitment.size).toBe(1);
        expect(index.ragequitByCommitment.get('0xcommitment123')).toBe(ragequit);
      });

      it('should skip ragequit without commitment', () => {
        const ragequit = createMockRagequitActivity(0, 0, '0xcommitment');
        ragequit.commitment = undefined;
        const index = buildActivityIndex([ragequit]);

        expect(index.ragequitByCommitment.size).toBe(0);
      });
    });

    describe('mixed activities', () => {
      it('should correctly index mixed activity types', () => {
        const deposit = createMockDepositActivity(0, '1000000000000000000');
        const withdrawal = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
        const withdraw2 = createMockWithdraw2Activity(1, 0, 2, 0, '300000000000000000');
        const ragequit = createMockRagequitActivity(3, 0, '0xragequit');

        const index = buildActivityIndex([deposit, withdrawal, withdraw2, ragequit]);

        expect(index.depositsByPrecommitment.size).toBe(1);
        expect(index.withdrawalsByNullifier.size).toBe(1);
        expect(index.withdraw2ByNullifier.size).toBe(2);
        expect(index.ragequitByCommitment.size).toBe(1);
      });

      it('should handle activities in any order', () => {
        const deposit = createMockDepositActivity(0, '1000000000000000000');
        const withdrawal = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');

        // Different order
        const index1 = buildActivityIndex([deposit, withdrawal]);
        const index2 = buildActivityIndex([withdrawal, deposit]);

        expect(index1.depositsByPrecommitment.size).toBe(index2.depositsByPrecommitment.size);
        expect(index1.withdrawalsByNullifier.size).toBe(index2.withdrawalsByNullifier.size);
      });

      it('should handle duplicate activities (last one wins)', () => {
        const deposit1 = createMockDepositActivity(0, '1000000000000000000', { id: 'first' });
        const deposit2 = createMockDepositActivity(0, '2000000000000000000', { id: 'second' });
        // Same precommitmentHash since same depositIndex

        const index = buildActivityIndex([deposit1, deposit2]);

        expect(index.depositsByPrecommitment.size).toBe(1);
        const indexed = index.depositsByPrecommitment.get(deposit1.precommitmentHash!);
        expect(indexed?.id).toBe('second'); // Last one wins
      });
    });
  });
});
