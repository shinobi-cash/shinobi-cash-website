/**
 * Tests for deposit-scanner.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { scanForDeposits } from '../../src/discovery/deposit-scanner.js';
import { buildActivityIndex } from '../../src/discovery/activity-indexer.js';
import { deriveAndHashNullifier } from '../../src/discovery/nullifier-utils.js';
import {
  createMockDepositActivity,
  createMockCrossChainDepositActivity,
  createMockPendingCrossChainDepositActivity,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  TEST_ACCOUNT_KEY,
  TEST_CHAIN_ID,
  toEther,
} from './fixtures.js';

describe('deposit-scanner', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  describe('scanForDeposits', () => {
    it('should return empty result for empty activity index', () => {
      const index = buildActivityIndex([]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      expect(result.newTrees).toHaveLength(0);
      expect(result.newNullifierEntries.size).toBe(0);
      expect(result.nextDepositIndex).toBe(0);
      expect(result.filledDepositsFound).toBe(0);
    });

    it('should find a single deposit at index 0', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      expect(result.newTrees).toHaveLength(1);
      expect(result.filledDepositsFound).toBe(1);
      expect(result.nextDepositIndex).toBe(1);
    });

    it('should create tree with correct deposit note at root', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      const tree = result.newTrees[0];
      const note = tree.root.note;
      expect(note.noteType).toBe('deposit');
      expect(note.depositIndex).toBe(0);
      expect(note.changeIndex).toBe(0);
      expect(note.amount).toBe(toEther(1).toString());
      expect(note.status).toBe('unspent');
    });

    it('should add nullifier entry for each deposit', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      expect(result.newNullifierEntries.size).toBe(1);

      const expectedNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
      const entry = result.newNullifierEntries.get(expectedNullifier);
      expect(entry).toEqual({ originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 });
    });

    it('should find multiple sequential deposits', () => {
      const deposits = [
        createMockDepositActivity(0, toEther(1)),
        createMockDepositActivity(1, toEther(2)),
        createMockDepositActivity(2, toEther(3)),
      ];
      const index = buildActivityIndex(deposits);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      expect(result.newTrees).toHaveLength(3);
      expect(result.filledDepositsFound).toBe(3);
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
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      // Should only find 0 and 1, stop at gap
      expect(result.newTrees).toHaveLength(2);
      expect(result.filledDepositsFound).toBe(2);
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
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 10);

      expect(result.newTrees).toHaveLength(2);
      expect(result.filledDepositsFound).toBe(2);
      expect(result.nextDepositIndex).toBe(3);

      // Verify we got deposits 1 and 2
      expect(result.newTrees[0].root.note.depositIndex).toBe(1);
      expect(result.newTrees[1].root.note.depositIndex).toBe(2);
    });

    it('should respect maxScan limit', () => {
      const deposits = [];
      for (let i = 0; i < 20; i++) {
        deposits.push(createMockDepositActivity(i, toEther(1)));
      }
      const index = buildActivityIndex(deposits);
      // Scan max 5 indices
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 5);

      expect(result.newTrees).toHaveLength(5);
      expect(result.filledDepositsFound).toBe(5);
      expect(result.nextDepositIndex).toBe(5);
    });

    it('should pass currentOffset to deposit note', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10, 42);

      const note = result.newTrees[0].root.note;
      expect(note.discoveredAtOffset).toBe(42);
    });

    it('should handle cross-chain deposits', () => {
      const deposit = createMockCrossChainDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      expect(result.newTrees).toHaveLength(1);
      const note = result.newTrees[0].root.note;
      expect(note.isCrossChain).toBe(true);
    });

    it('should not find deposits for different account key', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      // Use different account key
      const differentKey = TEST_ACCOUNT_KEY + 1n;
      const result = scanForDeposits(index, differentKey, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      expect(result.newTrees).toHaveLength(0);
      expect(result.filledDepositsFound).toBe(0);
    });

    it('should not find deposits for different pool address', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);
      // Use different pool address
      const differentPool = '0x9999999999999999999999999999999999999999';
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, differentPool, TEST_CHAIN_ID, 0, 10);

      expect(result.newTrees).toHaveLength(0);
      expect(result.filledDepositsFound).toBe(0);
    });

    it('should correctly chain multiple scans', () => {
      // First batch: deposits 0, 1
      const deposits1 = [
        createMockDepositActivity(0, toEther(1)),
        createMockDepositActivity(1, toEther(2)),
      ];
      const index1 = buildActivityIndex(deposits1);
      const result1 = scanForDeposits(index1, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      expect(result1.nextDepositIndex).toBe(2);

      // Second batch: deposits 2, 3
      const deposits2 = [
        createMockDepositActivity(2, toEther(3)),
        createMockDepositActivity(3, toEther(4)),
      ];
      const index2 = buildActivityIndex(deposits2);
      // Continue from where we left off
      const result2 = scanForDeposits(index2, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, result1.nextDepositIndex, 10);

      expect(result2.filledDepositsFound).toBe(2);
      expect(result2.nextDepositIndex).toBe(4);
      expect(result2.newTrees[0].root.note.depositIndex).toBe(2);
      expect(result2.newTrees[1].root.note.depositIndex).toBe(3);
    });

    it('should handle large deposit indices', () => {
      const deposit = createMockDepositActivity(1000, toEther(1));
      const index = buildActivityIndex([deposit]);
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1000, 10);

      expect(result.newTrees).toHaveLength(1);
      expect(result.newTrees[0].root.note.depositIndex).toBe(1000);
      expect(result.nextDepositIndex).toBe(1001);
    });

    it('should not find deposits when scanning with different chainId', () => {
      // Deposits are created with TEST_CHAIN_ID (421614) in fixtures
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);

      // Scan with a different chainId - should not find the deposit
      const differentChainId = '84532'; // Base Sepolia
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, differentChainId, 0, 10);

      expect(result.newTrees).toHaveLength(0);
      expect(result.filledDepositsFound).toBe(0);
    });

    it('should find deposit when scanning with matching chainId', () => {
      const deposit = createMockDepositActivity(0, toEther(1));
      const index = buildActivityIndex([deposit]);

      // Scan with matching chainId - should find the deposit
      const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

      expect(result.newTrees).toHaveLength(1);
      expect(result.filledDepositsFound).toBe(1);
    });

    describe('pending cross-chain deposits', () => {
      it('should create DepositIntentNote for pending cross-chain deposit', () => {
        const deposit = createMockPendingCrossChainDepositActivity(0, toEther(1));
        const index = buildActivityIndex([deposit]);
        const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

        expect(result.newTrees).toHaveLength(1);
        expect(result.pendingDepositsFound).toBe(1);

        // Should create DepositIntentNote, not DepositNote
        const note = result.newTrees[0].root.note;
        expect(note.noteType).toBe('depositIntent');
        expect(note.status).toBe('unspent');
        expect(note.isCrossChain).toBe(true);
      });

      it('should NOT add nullifier entry for pending cross-chain deposit', () => {
        const deposit = createMockPendingCrossChainDepositActivity(0, toEther(1));
        const index = buildActivityIndex([deposit]);
        const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

        // Pending deposits should not be added to nullifier map
        expect(result.newNullifierEntries.size).toBe(0);
      });

      it('should create DepositNote for filled cross-chain deposit', () => {
        // Filled cross-chain deposit (intentStatus='filled')
        const deposit = createMockCrossChainDepositActivity(0, toEther(1), {
          intentStatus: 'filled',
        });
        const index = buildActivityIndex([deposit]);
        const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10);

        // Should create DepositNote for filled deposit
        const note = result.newTrees[0].root.note;
        expect(note.noteType).toBe('deposit');
        expect(note.status).toBe('unspent');

        // Should add nullifier entry for filled deposit
        expect(result.newNullifierEntries.size).toBe(1);
      });

      it('should track discoveredAtOffset for pending deposits', () => {
        const deposit = createMockPendingCrossChainDepositActivity(0, toEther(1));
        const index = buildActivityIndex([deposit]);
        const currentOffset = 42;
        const result = scanForDeposits(index, TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 10, currentOffset);

        const note = result.newTrees[0].root.note;
        expect(note.discoveredAtOffset).toBe(42);
      });
    });
  });
});
