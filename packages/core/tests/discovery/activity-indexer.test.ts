/**
 * Tests for activity-indexer.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ActivityItem } from '@shinobi-cash/data';
import {
  buildActivityIndex,
  isDepositActivity,
  isSameChainWithdrawal,
  isSameChainWithdraw2,
  isCrosschainWithdrawIntent,
  isCrosschainWithdraw2Intent,
  isRagequitActivity,
} from '../../src/discovery/activity-indexer.js';
import {
  createMockDepositActivity,
  createMockCrossChainDepositActivity,
  createMock1x1WithdrawalActivity,
  createMockCrossChainWithdrawalActivity,
  createMockWithdraw2Activity,
  createMockCrossChainWithdraw2Activity,
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

    it('should return true for CROSSCHAIN_DEPOSIT_FILL type', () => {
      const activity = createMockCrossChainDepositActivity(0, '1000000000000000000');
      expect(isDepositActivity(activity)).toBe(true);
    });

    it('should return false for WITHDRAW type', () => {
      const activity = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
      expect(isDepositActivity(activity)).toBe(false);
    });
  });

  describe('isSameChainWithdrawal', () => {
    it('should return true for WITHDRAW type', () => {
      const activity = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
      expect(isSameChainWithdrawal(activity)).toBe(true);
    });

    it('should return false for CROSSCHAIN_WITHDRAW_INTENT type', () => {
      const activity = createMockCrossChainWithdrawalActivity(0, 0, '500000000000000000');
      expect(isSameChainWithdrawal(activity)).toBe(false);
    });

    it('should return false for DEPOSIT type', () => {
      const activity = createMockDepositActivity(0, '1000000000000000000');
      expect(isSameChainWithdrawal(activity)).toBe(false);
    });
  });

  describe('isSameChainWithdraw2', () => {
    it('should return true for WITHDRAW_2 type', () => {
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
      expect(isSameChainWithdraw2(activity)).toBe(true);
    });

    it('should return false for CROSSCHAIN_WITHDRAW_2_INTENT type', () => {
      const activity = createMockCrossChainWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
      expect(isSameChainWithdraw2(activity)).toBe(false);
    });

    it('should return false for WITHDRAW type', () => {
      const activity = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
      expect(isSameChainWithdraw2(activity)).toBe(false);
    });
  });

  describe('isCrosschainWithdrawIntent', () => {
    it('should return true for CROSSCHAIN_WITHDRAW_INTENT type', () => {
      const activity = createMockCrossChainWithdrawalActivity(0, 0, '500000000000000000');
      expect(isCrosschainWithdrawIntent(activity)).toBe(true);
    });

    it('should return false for WITHDRAW type', () => {
      const activity = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
      expect(isCrosschainWithdrawIntent(activity)).toBe(false);
    });
  });

  describe('isCrosschainWithdraw2Intent', () => {
    it('should return true for CROSSCHAIN_WITHDRAW_2_INTENT type', () => {
      const activity = createMockCrossChainWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
      expect(isCrosschainWithdraw2Intent(activity)).toBe(true);
    });

    it('should return false for WITHDRAW_2 type', () => {
      const activity = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
      expect(isCrosschainWithdraw2Intent(activity)).toBe(false);
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
  });

  describe('buildActivityIndex', () => {
    it('should return empty maps for empty activities', () => {
      const index = buildActivityIndex([]);

      expect(index.depositsByPrecommitment.size).toBe(0);
      expect(index.sameChainWithdrawalsByNullifier.size).toBe(0);
      expect(index.sameChainWithdraw2ByNullifier.size).toBe(0);
      expect(index.crosschainWithdrawIntentsByNullifier.size).toBe(0);
      expect(index.crosschainWithdraw2IntentsByNullifier.size).toBe(0);
      expect(index.ragequitByCommitment.size).toBe(0);
    });

    describe('deposit indexing', () => {
      it('should index deposits by precommitment', () => {
        const deposit = createMockDepositActivity(0, '1000000000000000000');
        const index = buildActivityIndex([deposit]);

        expect(index.depositsByPrecommitment.size).toBe(1);
        expect(index.depositsByPrecommitment.get(deposit.precommitment)).toBe(deposit);
      });

      it('should index cross-chain deposit fills', () => {
        const deposit = createMockCrossChainDepositActivity(0, '1000000000000000000');
        const index = buildActivityIndex([deposit]);

        expect(index.depositsByPrecommitment.size).toBe(1);
        expect(index.depositsByPrecommitment.get(deposit.precommitment)).toBe(deposit);
      });

      it('should index multiple deposits', () => {
        const deposit0 = createMockDepositActivity(0, '1000000000000000000');
        const deposit1 = createMockDepositActivity(1, '2000000000000000000');
        const index = buildActivityIndex([deposit0, deposit1]);

        expect(index.depositsByPrecommitment.size).toBe(2);
        expect(index.depositsByPrecommitment.get(deposit0.precommitment)).toBe(deposit0);
        expect(index.depositsByPrecommitment.get(deposit1.precommitment)).toBe(deposit1);
      });
    });

    describe('1:1 withdrawal indexing', () => {
      it('should index same-chain withdrawals by nullifier', () => {
        const withdrawal = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');
        const index = buildActivityIndex([withdrawal]);

        expect(index.sameChainWithdrawalsByNullifier.size).toBe(1);
        expect(index.sameChainWithdrawalsByNullifier.get(withdrawal.spentNullifiers[0])).toBe(withdrawal);
      });

      it('should index cross-chain withdrawal intents by nullifier', () => {
        const withdrawal = createMockCrossChainWithdrawalActivity(0, 0, '500000000000000000');
        const index = buildActivityIndex([withdrawal]);

        expect(index.crosschainWithdrawIntentsByNullifier.size).toBe(1);
        expect(index.crosschainWithdrawIntentsByNullifier.get(withdrawal.spentNullifiers[0])).toBe(withdrawal);
      });

      it('should index cross-chain withdrawal intents by orderId', () => {
        const withdrawal = createMockCrossChainWithdrawalActivity(0, 0, '500000000000000000');
        const index = buildActivityIndex([withdrawal]);

        expect(index.withdrawalFillsByOrderId.size).toBe(0); // Intent, not fill
        expect(index.withdrawalRefundsByOrderId.size).toBe(0);
      });
    });

    describe('Withdraw2 indexing', () => {
      it('should index Withdraw2 by both nullifiers', () => {
        const withdraw2 = createMockWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
        const index = buildActivityIndex([withdraw2]);

        expect(index.sameChainWithdraw2ByNullifier.size).toBe(2);
        expect(index.sameChainWithdraw2ByNullifier.get(withdraw2.spentNullifiers[0])).toBe(withdraw2);
        expect(index.sameChainWithdraw2ByNullifier.get(withdraw2.spentNullifiers[1])).toBe(withdraw2);
      });

      it('should index cross-chain Withdraw2 intents by both nullifiers', () => {
        const withdraw2 = createMockCrossChainWithdraw2Activity(0, 0, 1, 0, '500000000000000000');
        const index = buildActivityIndex([withdraw2]);

        expect(index.crosschainWithdraw2IntentsByNullifier.size).toBe(2);
        expect(index.crosschainWithdraw2IntentsByNullifier.get(withdraw2.spentNullifiers[0])).toBe(withdraw2);
        expect(index.crosschainWithdraw2IntentsByNullifier.get(withdraw2.spentNullifiers[1])).toBe(withdraw2);
      });
    });

    describe('ragequit indexing', () => {
      it('should index ragequit by commitment', () => {
        const ragequit = createMockRagequitActivity(0, 0, '0xcommitment123');
        const index = buildActivityIndex([ragequit]);

        expect(index.ragequitByCommitment.size).toBe(1);
        expect(index.ragequitByCommitment.get('0xcommitment123')).toBe(ragequit);
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
        expect(index.sameChainWithdrawalsByNullifier.size).toBe(1);
        expect(index.sameChainWithdraw2ByNullifier.size).toBe(2);
        expect(index.ragequitByCommitment.size).toBe(1);
      });

      it('should handle activities in any order', () => {
        const deposit = createMockDepositActivity(0, '1000000000000000000');
        const withdrawal = createMock1x1WithdrawalActivity(0, 0, '500000000000000000');

        // Different order
        const index1 = buildActivityIndex([deposit, withdrawal]);
        const index2 = buildActivityIndex([withdrawal, deposit]);

        expect(index1.depositsByPrecommitment.size).toBe(index2.depositsByPrecommitment.size);
        expect(index1.sameChainWithdrawalsByNullifier.size).toBe(index2.sameChainWithdrawalsByNullifier.size);
      });

      it('should handle duplicate activities (last one wins)', () => {
        const deposit1 = createMockDepositActivity(0, '1000000000000000000');
        const deposit2 = createMockDepositActivity(0, '2000000000000000000');
        // Same precommitment since same depositIndex

        const index = buildActivityIndex([deposit1, deposit2]);

        expect(index.depositsByPrecommitment.size).toBe(1);
        const indexed = index.depositsByPrecommitment.get(deposit1.precommitment);
        expect(indexed?.txHash).toBe(deposit2.txHash); // Last one wins
      });
    });
  });
});
