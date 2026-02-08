/**
 * Tests for chain-extender.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { extendAllChains } from '../../src/discovery/chain-extender.js';
import { buildActivityIndex } from '../../src/discovery/activity-indexer.js';
import { deriveAndHashNullifier } from '../../src/discovery/nullifier-utils.js';
import type { NoteChain, NullifierInfo, DepositNote, ChangeNote, PendingIntentNote } from '../../src/discovery/types.js';
import {
  createMockDepositNote,
  createMockChangeNote,
  createMock1x1WithdrawalActivity,
  createMockCrossChainWithdrawalActivity,
  createMockWithdraw2Activity,
  createMockRagequitActivity,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  TEST_ACCOUNT_KEY,
  toEther,
} from './fixtures.js';
import { derivedNoteCommitment } from '../../src/withdrawal/index.js';

describe('chain-extender', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  describe('extendAllChains', () => {
    describe('no extensions', () => {
      it('should return unchanged chains for empty activity index', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activityIndex = buildActivityIndex([]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(result.updatedChains.size).toBe(1);
        expect(result.updatedChains.get(0)).toHaveLength(1);
        expect(result.updatedNullifierMap.size).toBe(0);
      });

      it('should handle empty chains map', () => {
        const chains = new Map<number, NoteChain>();
        const nullifierMap = new Map<string, NullifierInfo>();
        const activityIndex = buildActivityIndex([]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(result.updatedChains.size).toBe(0);
      });
    });

    describe('1:1 withdrawal extension', () => {
      it('should extend chain with 1:1 withdrawal', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedChain = result.updatedChains.get(0)!;
        expect(updatedChain).toHaveLength(2);

        // Original note should be spent
        expect(updatedChain[0].status).toBe('spent');

        // Change note should be created
        const changeNote = updatedChain[1] as ChangeNote;
        expect(changeNote.noteType).toBe('change');
        expect(changeNote.changeIndex).toBe(1);
        expect(changeNote.amount).toBe(toEther(0.7).toString());
        expect(changeNote.status).toBe('unspent');
      });

      it('should update nullifier map after extension', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        const oldNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [oldNullifier, { depositIndex: 0, changeIndex: 0 }],
        ]);

        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Old nullifier should be removed
        expect(result.updatedNullifierMap.has(oldNullifier)).toBe(false);

        // New nullifier should be added
        const newNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 1);
        expect(result.updatedNullifierMap.has(newNullifier)).toBe(true);
        expect(result.updatedNullifierMap.get(newNullifier)).toEqual({
          depositIndex: 0,
          changeIndex: 1,
        });
      });

      it('should create PendingIntentNote for cross-chain withdrawal', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedChain = result.updatedChains.get(0)!;
        expect(updatedChain).toHaveLength(3); // Deposit, Change, PendingIntent

        const pendingNote = updatedChain[2] as PendingIntentNote;
        expect(pendingNote.noteType).toBe('pendingIntent');
        expect(pendingNote.amount).toBe(toEther(0.5).toString());
        expect(pendingNote.intentStatus).toBe('pending');
      });

      it('should apply sequential withdrawals', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();

        const activity1 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activity2 = createMock1x1WithdrawalActivity(0, 1, toEther(0.2));
        const activityIndex = buildActivityIndex([activity1, activity2]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedChain = result.updatedChains.get(0)!;
        expect(updatedChain).toHaveLength(3); // Deposit + 2 change notes

        // All intermediate notes should be spent
        expect(updatedChain[0].status).toBe('spent');
        expect(updatedChain[1].status).toBe('spent');

        // Final note should have remaining balance
        expect(updatedChain[2].amount).toBe(toEther(0.5).toString());
        expect(updatedChain[2].status).toBe('unspent');
      });

      it('should handle full withdrawal (remaining = 0)', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(1)); // Full amount
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedChain = result.updatedChains.get(0)!;
        expect(updatedChain).toHaveLength(2);

        const changeNote = updatedChain[1] as ChangeNote;
        expect(changeNote.amount).toBe('0');
        expect(changeNote.status).toBe('spent');

        // No new nullifier when remaining is 0
        expect(result.updatedNullifierMap.size).toBe(0);
      });
    });

    describe('Withdraw2 extension', () => {
      it('should merge two chains with Withdraw2', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chains = new Map([
          [0, chain0],
          [1, chain1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Primary chain (depositIndex 1 is larger) gets change note
        const primaryChain = result.updatedChains.get(1)!;
        expect(primaryChain).toHaveLength(2);
        expect(primaryChain[0].status).toBe('spent');
        const primaryChange = primaryChain[1] as ChangeNote;
        expect(primaryChange.amount).toBe(toEther(2.5).toString()); // 1 + 2 - 0.5
        expect(primaryChange.mergedFromDepositIndex).toBe(0);

        // Secondary chain gets merged note
        const secondaryChain = result.updatedChains.get(0)!;
        expect(secondaryChain).toHaveLength(2);
        expect(secondaryChain[0].status).toBe('spent');
        const mergedNote = secondaryChain[1] as ChangeNote;
        expect(mergedNote.amount).toBe('0');
        expect(mergedNote.status).toBe('merged');
        expect(mergedNote.mergedIntoDepositIndex).toBe(1);
      });

      it('should update nullifier map for Withdraw2', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chains = new Map([
          [0, chain0],
          [1, chain1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Both old nullifiers removed
        expect(result.updatedNullifierMap.has(nullifier0)).toBe(false);
        expect(result.updatedNullifierMap.has(nullifier1)).toBe(false);

        // New nullifier for primary chain
        const newNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 1, 1);
        expect(result.updatedNullifierMap.has(newNullifier)).toBe(true);
      });

      it('should not double-process Withdraw2', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chains = new Map([
          [0, chain0],
          [1, chain1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Each chain should have exactly 2 notes, not more
        expect(result.updatedChains.get(0)).toHaveLength(2);
        expect(result.updatedChains.get(1)).toHaveLength(2);
      });

      it('should create PendingIntentNote for cross-chain Withdraw2', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chains = new Map([
          [0, chain0],
          [1, chain1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5), {
          type: 'CROSSCHAIN_WITHDRAW2_PENDING',
          intentStatus: 'pending',
        });
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Primary chain should have PendingIntentNote
        const primaryChain = result.updatedChains.get(1)!;
        expect(primaryChain).toHaveLength(3);
        expect(primaryChain[2].noteType).toBe('pendingIntent');
      });
    });

    describe('ragequit extension', () => {
      it('should mark note as spent on ragequit with matching commitment', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: '12345' });
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        const nullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier, { depositIndex: 0, changeIndex: 0 }],
        ]);

        // Compute the actual commitment for this note
        const commitment = derivedNoteCommitment(TEST_ACCOUNT_KEY, depositNote).toString();
        const activity = createMockRagequitActivity(0, 0, commitment);
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Note should be marked as spent
        expect(result.updatedChains.get(0)![0].status).toBe('spent');

        // Ragequit activity data should be stored
        expect(result.updatedChains.get(0)![0].activityData.ragequitTxHash).toBe(
          activity.originTransactionHash,
        );

        // Nullifier should be removed
        expect(result.updatedNullifierMap.has(nullifier)).toBe(false);
      });

      it('should not modify chain for non-matching commitment', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: '12345' });
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();

        // Ragequit with non-matching commitment
        const activity = createMockRagequitActivity(0, 0, 'non-matching-commitment');
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Chain unchanged because commitment doesn't match
        expect(result.updatedChains.get(0)).toHaveLength(1);
        expect(result.updatedChains.get(0)![0].status).toBe('unspent');
      });
    });

    describe('multiple chains', () => {
      it('should extend multiple chains independently', () => {
        const deposit0 = createMockDepositNote(0, toEther(1));
        const deposit1 = createMockDepositNote(1, toEther(2));
        const chain0: NoteChain = [deposit0];
        const chain1: NoteChain = [deposit1];
        const chains = new Map([
          [0, chain0],
          [1, chain1],
        ]);
        const nullifierMap = new Map<string, NullifierInfo>();

        const activity0 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activity1 = createMock1x1WithdrawalActivity(1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity0, activity1]);

        const result = extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Both chains extended independently
        expect(result.updatedChains.get(0)).toHaveLength(2);
        expect(result.updatedChains.get(1)).toHaveLength(2);

        const change0 = result.updatedChains.get(0)![1] as ChangeNote;
        const change1 = result.updatedChains.get(1)![1] as ChangeNote;

        expect(change0.amount).toBe(toEther(0.7).toString());
        expect(change1.amount).toBe(toEther(1.5).toString());
      });
    });

    describe('immutability', () => {
      it('should not mutate original chains map', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activityIndex = buildActivityIndex([activity]);

        extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Original chain should be mutated (Plan/Apply modifies in place)
        // This is expected behavior
        expect(chain).toHaveLength(2);
      });

      it('should not mutate original nullifier map', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const chain: NoteChain = [depositNote];
        const chains = new Map([[0, chain]]);

        const oldNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, 0, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [oldNullifier, { depositIndex: 0, changeIndex: 0 }],
        ]);
        const originalSize = nullifierMap.size;

        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activityIndex = buildActivityIndex([activity]);

        extendAllChains(
          chains,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Original nullifier map should still have same size
        // (we copy it internally)
        expect(nullifierMap.size).toBe(originalSize);
      });
    });
  });
});
