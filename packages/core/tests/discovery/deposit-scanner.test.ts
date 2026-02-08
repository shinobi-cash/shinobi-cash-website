/**
 * Tests for deposit-scanner.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { scanForDeposits } from '../../src/discovery/deposit-scanner.js';
import { buildActivityIndex, type ActivityIndex } from '../../src/discovery/activity-indexer.js';
import { deriveAndHashNullifier } from '../../src/discovery/nullifier-utils.js';
import {
  createMockDepositActivity,
  createMockCrossChainDepositActivity,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  TEST_ACCOUNT_KEY,
  toEther,
} from './fixtures.js';

describe('deposit-scanner', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  describe('scanForDeposits', () => {
    it('should return empty result for empty activity index', () => {
      const index = buildActivityIndex([]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

      expect(result.newChains).toHaveLength(0);
      expect(result.newNullifierEntries.size).toBe(0);
      expect(result.nextDepositIndex).toBe(0);
      expect(result.depositsFound).toBe(0);
    });

    it('should find a single deposit at index 0', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

      expect(result.newChains).toHaveLength(1);
      expect(result.depositsFound).toBe(1);
      expect(result.nextDepositIndex).toBe(1);
    });

    it('should create chain with correct deposit note', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

      const chain = result.newChains[0];
      expect(chain).toHaveLength(1);

      const note = chain[0];
      expect(note.noteType).toBe('deposit');
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(0);
      expect(note.amount).toBe(toEther(1).toString());
      expect(note.status).toBe('unspent');
    });

    it('should add nullifier entry for each deposit', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

      expect(result.newNullifierEntries.size).toBe(1);

      const expectedNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 0);
      const entry = result.newNullifierEntries.get(expectedNullifier);
      expect(entry).toEqual({ depositIndex: 0, changeIndex: 0 });
    });

    it('should find multiple sequential deposits', () => {
      const deposits = [
        createMockDepositActivity(0, toEther(1)),
        createMockDepositActivity(1, toEther(2)),
        createMockDepositActivity(2, toEther(3)),
      ];
      const index = buildActivityIndex(deposits);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

      expect(result.newChains).toHaveLength(3);
      expect(result.depositsFound).toBe(3);
      expect(result.nextDepositIndex).toBe(3);
      expect(result.newNullifierEntries.size).toBe(3);
    });

    it('should stop at first gap in deposit indices', () => {
      // Deposits at 0, 1, 3 (missing 2)
      const deposits = [
        createMockDepositActivity(0, toEther(1)),
        createMockDepositActivity(1, toEther(2)),
        createMockDepositActivity(3, toEther(4)), // Gap at index 2
      ];
      const index = buildActivityIndex(deposits);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

      // Should only find 0 and 1, stop at gap
      expect(result.newChains).toHaveLength(2);
      expect(result.depositsFound).toBe(2);
      expect(result.nextDepositIndex).toBe(2);
    });

    it('should start scanning from startIndex', () => {
      const deposits = [
        createMockDepositActivity(0, toEther(1)),
        createMockDepositActivity(1, toEther(2)),
        createMockDepositActivity(2, toEther(3)),
      ];
      const index = buildActivityIndex(deposits);
      // Start from index 1
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 1, 10);

      expect(result.newChains).toHaveLength(2);
      expect(result.depositsFound).toBe(2);
      expect(result.nextDepositIndex).toBe(3);

      // Verify we got deposits 1 and 2
      expect(result.newChains[0][0].depositIndex).toBe(1);
      expect(result.newChains[1][0].depositIndex).toBe(2);
    });

    it('should respect maxScan limit', () => {
      const deposits = [];
      for (let i = 0; i < 20; i++) {
        deposits.push(createMockDepositActivity(i, toEther(1)));
      }
      const index = buildActivityIndex(deposits);
      // Scan max 5 indices
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 5);

      expect(result.newChains).toHaveLength(5);
      expect(result.depositsFound).toBe(5);
      expect(result.nextDepositIndex).toBe(5);
    });

    it('should pass currentOffset to deposit note', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10, 42);

      const note = result.newChains[0][0];
      expect(note.discoveredAtOffset).toBe(42);
    });

    it('should handle cross-chain deposits', () => {
      const deposit = createMockCrossChainDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

      expect(result.newChains).toHaveLength(1);
      const note = result.newChains[0][0];
      expect(note.isCrossChain).toBe(true);
    });

    it('should not find deposits for different account key', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      // Use different account key
      const differentKey = TEST_ACCOUNT_KEY + 1n;
      const result = scanForDeposits(index, differentKey, TEST_POOL_ADDRESS, 0, 10);

      expect(result.newChains).toHaveLength(0);
      expect(result.depositsFound).toBe(0);
    });

    it('should not find deposits for different pool address', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      // Use different pool address
      const differentPool = '0x9999999999999999999999999999999999999999';
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, differentPool, 0, 10);

      expect(result.newChains).toHaveLength(0);
      expect(result.depositsFound).toBe(0);
    });

    it('should correctly chain multiple scans', () => {
      // First batch: deposits 0, 1
      const deposits1 = [
        createMockDepositActivity(0, toEther(1)),
        createMockDepositActivity(1, toEther(2)),
      ];
      const index1 = buildActivityIndex(deposits1);
      const result1 = scanForDeposits(index1, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 10);

      expect(result1.nextDepositIndex).toBe(2);

      // Second batch: deposits 2, 3
      const deposits2 = [
        createMockDepositActivity(2, toEther(3)),
        createMockDepositActivity(3, toEther(4)),
      ];
      const index2 = buildActivityIndex(deposits2);
      // Continue from where we left off
      const result2 = scanForDeposits(index2, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, result1.nextDepositIndex, 10);

      expect(result2.depositsFound).toBe(2);
      expect(result2.nextDepositIndex).toBe(4);
      expect(result2.newChains[0][0].depositIndex).toBe(2);
      expect(result2.newChains[1][0].depositIndex).toBe(3);
    });

    it('should handle large deposit indices', () => {
      const deposit = createMockDepositActivity(1000, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 1000, 10);

      expect(result.newChains).toHaveLength(1);
      expect(result.newChains[0][0].depositIndex).toBe(1000);
      expect(result.nextDepositIndex).toBe(1001);
    });
  });
});
