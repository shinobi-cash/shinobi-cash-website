/**
 * Tests for chain-extender.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { extendAllTrees } from '../../src/discovery/chain-extender.js';
import { buildActivityIndex } from '../../src/discovery/activity-indexer.js';
import { deriveAndHashNullifier } from '../../src/discovery/nullifier-utils.js';
import type { NoteTree, NullifierInfo, ChangeNote, WithdrawalIntentNote, MergedNote, ChainKey, WithdrawalNote } from '../../src/discovery/types.js';
import { makeChainKey } from '../../src/discovery/types.js';
import {
  createMockNoteTree,
  createMockDepositNote,
  createMock1x1WithdrawalActivity,
  createMockCrossChainWithdrawalActivity,
  createMockWithdraw2Activity,
  createMockRagequitActivity,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  TEST_ACCOUNT_KEY,
  TEST_CHAIN_ID,
  toEther,
} from './fixtures.js';
import { derivedNoteCommitment } from '../../src/withdrawal/index.js';
import { getLeafNodes, findNodeByPosition, createNoteTree } from '../../src/discovery/tree-utils.js';

describe('chain-extender', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  describe('extendAllTrees', () => {
    describe('no extensions', () => {
      it('should return unchanged trees for empty activity index', () => {
        const tree = createMockNoteTree(0, toEther(1));
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activityIndex = buildActivityIndex([]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(result.updatedTrees.size).toBe(1);
        const updatedTree = result.updatedTrees.get(chainKey)!;
        expect(getLeafNodes(updatedTree)).toHaveLength(1);
        expect(result.updatedNullifierMap.size).toBe(0);
      });

      it('should handle empty trees map', () => {
        const trees = new Map<ChainKey, NoteTree>();
        const nullifierMap = new Map<string, NullifierInfo>();
        const activityIndex = buildActivityIndex([]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        expect(result.updatedTrees.size).toBe(0);
      });
    });

    describe('1:1 withdrawal extension', () => {
      it('should extend tree with 1:1 withdrawal', () => {
        const tree = createMockNoteTree(0, toEther(1));
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedTree = result.updatedTrees.get(chainKey)!;

        // Original note should be spent
        expect(updatedTree.root.note.status).toBe('spent');

        // Should have two children: ChangeNote (spendable) + WithdrawalNote (terminal record)
        expect(updatedTree.root.children).toHaveLength(2);

        // Find the change note (spendable remaining balance)
        const changeNode = updatedTree.root.children.find((c) => c.note.noteType === 'change')!;
        expect(changeNode).toBeDefined();
        expect(changeNode.note.changeIndex).toBe(1);
        expect(changeNode.note.amount).toBe(toEther(0.7).toString());
        expect(changeNode.note.status).toBe('unspent');

        // Find the withdrawal note (terminal record)
        const withdrawalNode = updatedTree.root.children.find((c) => c.note.noteType === 'withdrawal')!;
        expect(withdrawalNode).toBeDefined();
        expect(withdrawalNode.note.amount).toBe('0'); // Terminal notes have no remaining balance
        expect((withdrawalNode.note as WithdrawalNote).withdrawnAmount).toBe(toEther(0.3).toString()); // Withdrawn amount
        // WithdrawalNote is terminal - no status field, just isTerminal flag
        expect(withdrawalNode.isTerminal).toBe(true);
      });

      it('should update nullifier map after extension', () => {
        const tree = createMockNoteTree(0, toEther(1));
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const oldNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [oldNullifier, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
        ]);

        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Old nullifier should be removed
        expect(result.updatedNullifierMap.has(oldNullifier)).toBe(false);

        // New nullifier should be added
        const newNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 1);
        expect(result.updatedNullifierMap.has(newNullifier)).toBe(true);
        expect(result.updatedNullifierMap.get(newNullifier)).toEqual({
          originChainId: TEST_CHAIN_ID.toString(),
          depositIndex: 0,
          changeIndex: 1,
        });
      });

      it('should create WithdrawalIntentNote for cross-chain withdrawal', () => {
        const tree = createMockNoteTree(0, toEther(1));
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedTree = result.updatedTrees.get(chainKey)!;

        // Root should have 2 children: ChangeNote and WithdrawalIntentNote (siblings)
        expect(updatedTree.root.children).toHaveLength(2);

        const intentNode = updatedTree.root.children.find((c) => c.note.noteType === 'withdrawalIntent');
        expect(intentNode).toBeDefined();
        expect(intentNode!.note.amount).toBe(toEther(0.5).toString());
        // Intent notes track pending state by noteType, not by intentStatus field
        expect((intentNode!.note as WithdrawalIntentNote).destinationChainId).toBe('84532');
      });

      it('should apply sequential withdrawals', () => {
        const tree = createMockNoteTree(0, toEther(1));
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);
        const nullifierMap = new Map<string, NullifierInfo>();

        const activity1 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activity2 = createMock1x1WithdrawalActivity(0, 1, toEther(0.2));
        const activityIndex = buildActivityIndex([activity1, activity2]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedTree = result.updatedTrees.get(chainKey)!;

        // Root (deposit) → [Change1, Withdrawal1] → [Change2, Withdrawal2]
        expect(updatedTree.root.note.status).toBe('spent');
        expect(updatedTree.root.children).toHaveLength(2); // ChangeNote + WithdrawalNote

        const change1 = updatedTree.root.children.find((c) => c.note.noteType === 'change')!;
        expect(change1.note.status).toBe('spent');
        expect(change1.children).toHaveLength(2); // ChangeNote + WithdrawalNote

        const change2 = change1.children.find((c) => c.note.noteType === 'change')!;
        expect(change2.note.amount).toBe(toEther(0.5).toString());
        expect(change2.note.status).toBe('unspent');
      });

      it('should handle full withdrawal (remaining = 0)', () => {
        const tree = createMockNoteTree(0, toEther(1));
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);
        const nullifierMap = new Map<string, NullifierInfo>();
        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(1)); // Full amount
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedTree = result.updatedTrees.get(chainKey)!;
        expect(updatedTree.root.children).toHaveLength(2); // ChangeNote + WithdrawalNote

        const changeNode = updatedTree.root.children.find((c) => c.note.noteType === 'change')!;
        const changeNote = changeNode.note as ChangeNote;
        expect(changeNote.amount).toBe('0');
        expect(changeNote.status).toBe('spent');

        const withdrawalNode = updatedTree.root.children.find((c) => c.note.noteType === 'withdrawal')!;
        expect(withdrawalNode.note.amount).toBe('0'); // Terminal notes have no remaining balance
        expect((withdrawalNode.note as WithdrawalNote).withdrawnAmount).toBe(toEther(1).toString()); // Full withdrawal
        expect(withdrawalNode.isTerminal).toBe(true);

        // No new nullifier when remaining is 0
        expect(result.updatedNullifierMap.size).toBe(0);
      });
    });

    describe('Withdraw2 extension', () => {
      it('should merge two trees with Withdraw2', () => {
        const tree0 = createMockNoteTree(0, toEther(1));
        const tree1 = createMockNoteTree(1, toEther(2));
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const trees = new Map<ChainKey, NoteTree>([
          [chainKey0, tree0],
          [chainKey1, tree1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Primary tree (depositIndex 1 is larger) gets change note + withdrawal note
        const primaryTree = result.updatedTrees.get(chainKey1)!;
        expect(primaryTree.root.note.status).toBe('spent');
        expect(primaryTree.root.children).toHaveLength(2); // ChangeNote + WithdrawalNote

        const primaryChangeNode = primaryTree.root.children.find((c) => c.note.noteType === 'change')!;
        const primaryChange = primaryChangeNode.note as ChangeNote;
        expect(primaryChange.amount).toBe(toEther(2.5).toString()); // 1 + 2 - 0.5
        // mergedFrom is a map of serialNumber -> amount
        expect(Object.keys(primaryChange.mergedFrom).length).toBe(1);

        // Secondary tree gets merged note
        const secondaryTree = result.updatedTrees.get(chainKey0)!;
        expect(secondaryTree.root.note.status).toBe('spent');
        expect(secondaryTree.root.children).toHaveLength(1);

        const mergedNode = secondaryTree.root.children[0];
        expect(mergedNode.note.noteType).toBe('merged');
        const mergedNote = mergedNode.note as MergedNote;
        // Terminal notes have no remaining balance
        expect(mergedNote.amount).toBe('0');
        // MergedNote keeps original amount for record in contributedAmount
        expect(mergedNote.contributedAmount).toBe(toEther(1).toString());
        // MergedNote tracks which note it merged into via serialNumber
        expect(mergedNote.mergedIntoSerialNumber).toBeDefined();
        expect(mergedNode.isTerminal).toBe(true);
      });

      it('should update nullifier map for Withdraw2', () => {
        const tree0 = createMockNoteTree(0, toEther(1));
        const tree1 = createMockNoteTree(1, toEther(2));
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const trees = new Map<ChainKey, NoteTree>([
          [chainKey0, tree0],
          [chainKey1, tree1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Both old nullifiers removed
        expect(result.updatedNullifierMap.has(nullifier0)).toBe(false);
        expect(result.updatedNullifierMap.has(nullifier1)).toBe(false);

        // New nullifier for primary tree
        const newNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 1);
        expect(result.updatedNullifierMap.has(newNullifier)).toBe(true);
      });

      it('should not double-process Withdraw2', () => {
        const tree0 = createMockNoteTree(0, toEther(1));
        const tree1 = createMockNoteTree(1, toEther(2));
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const trees = new Map<ChainKey, NoteTree>([
          [chainKey0, tree0],
          [chainKey1, tree1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Secondary tree has 1 child (merged note only)
        // Primary tree has 2 children (ChangeNote + WithdrawalNote)
        expect(result.updatedTrees.get(chainKey0)!.root.children).toHaveLength(1); // Secondary = merged
        expect(result.updatedTrees.get(chainKey1)!.root.children).toHaveLength(2); // Primary = change + withdrawal
      });

      it('should create WithdrawalIntentNote for cross-chain Withdraw2', () => {
        const tree0 = createMockNoteTree(0, toEther(1));
        const tree1 = createMockNoteTree(1, toEther(2));
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const trees = new Map<ChainKey, NoteTree>([
          [chainKey0, tree0],
          [chainKey1, tree1],
        ]);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5), {
          type: 'CROSSCHAIN_WITHDRAW2_PENDING',
          destinationChainId: BigInt(84532),
          refundCommitment: '0xrefund-withdraw2',
          orderId: 'order-withdraw2',
          fillDeadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
          expires: BigInt(Math.floor(Date.now() / 1000) + 86400),
        });
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Primary tree should have 2 children: ChangeNote and WithdrawalIntentNote
        const primaryTree = result.updatedTrees.get(chainKey1)!;
        expect(primaryTree.root.children).toHaveLength(2);

        const intentNode = primaryTree.root.children.find((c) => c.note.noteType === 'withdrawalIntent');
        expect(intentNode).toBeDefined();
      });
    });

    describe('ragequit extension', () => {
      it('should mark note as ragequit with matching commitment', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: '12345' });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const nullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [nullifier, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
        ]);

        // Compute the actual commitment for this note
        const commitment = derivedNoteCommitment(TEST_ACCOUNT_KEY, depositNote).toString();
        const activity = createMockRagequitActivity(0, 0, commitment);
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedTree = result.updatedTrees.get(chainKey)!;

        // Parent note should be marked as spent
        expect(updatedTree.root.note.status).toBe('spent');

        // Should have a RagequitNote child
        expect(updatedTree.root.children).toHaveLength(1);
        const ragequitNode = updatedTree.root.children[0];
        expect(ragequitNode.note.noteType).toBe('ragequit');
        expect(ragequitNode.isTerminal).toBe(true);

        // RagequitNote should have originTransactionHash from the activity
        expect(ragequitNode.note.originTransactionHash).toBe(activity.originTransactionHash);

        // Nullifier should be removed
        expect(result.updatedNullifierMap.has(nullifier)).toBe(false);
      });

      it('should not modify tree for non-matching commitment', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: '12345' });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);
        const nullifierMap = new Map<string, NullifierInfo>();

        // Ragequit with non-matching commitment
        const activity = createMockRagequitActivity(0, 0, 'non-matching-commitment');
        const activityIndex = buildActivityIndex([activity]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedTree = result.updatedTrees.get(chainKey)!;

        // Tree unchanged because commitment doesn't match
        expect(updatedTree.root.children).toHaveLength(0);
        expect(updatedTree.root.note.status).toBe('unspent');
      });
    });

    describe('multiple trees', () => {
      it('should extend multiple trees independently', () => {
        const tree0 = createMockNoteTree(0, toEther(1));
        const tree1 = createMockNoteTree(1, toEther(2));
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
        const trees = new Map<ChainKey, NoteTree>([
          [chainKey0, tree0],
          [chainKey1, tree1],
        ]);
        const nullifierMap = new Map<string, NullifierInfo>();

        const activity0 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activity1 = createMock1x1WithdrawalActivity(1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity0, activity1]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Both trees extended independently with 2 children each (ChangeNote + WithdrawalNote)
        expect(result.updatedTrees.get(chainKey0)!.root.children).toHaveLength(2);
        expect(result.updatedTrees.get(chainKey1)!.root.children).toHaveLength(2);

        const change0 = result.updatedTrees.get(chainKey0)!.root.children.find((c) => c.note.noteType === 'change')!.note as ChangeNote;
        const change1 = result.updatedTrees.get(chainKey1)!.root.children.find((c) => c.note.noteType === 'change')!.note as ChangeNote;

        expect(change0.amount).toBe(toEther(0.7).toString());
        expect(change1.amount).toBe(toEther(1.5).toString());
      });
    });

    describe('immutability', () => {
      it('should not mutate original nullifier map', () => {
        const tree = createMockNoteTree(0, toEther(1));
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const oldNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifierMap = new Map<string, NullifierInfo>([
          [oldNullifier, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
        ]);
        const originalSize = nullifierMap.size;

        const activity = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activityIndex = buildActivityIndex([activity]);

        extendAllTrees(
          trees,
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

    describe('idempotency', () => {
      it('should produce same result when same page is processed twice', () => {
        const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
        const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);

        const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
        const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);

        // Create activities
        const activity1 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const withdraw2Activity = createMockWithdraw2Activity(0, 1, 1, 0, toEther(0.5));
        const activityIndex = buildActivityIndex([activity1, withdraw2Activity]);

        // First pass - create fresh trees
        const trees1 = new Map<ChainKey, NoteTree>([
          [chainKey0, createMockNoteTree(0, toEther(1))],
          [chainKey1, createMockNoteTree(1, toEther(2))],
        ]);
        const nullifierMap1 = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const result1 = extendAllTrees(
          trees1,
          nullifierMap1,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Second pass - create fresh trees again
        const trees2 = new Map<ChainKey, NoteTree>([
          [chainKey0, createMockNoteTree(0, toEther(1))],
          [chainKey1, createMockNoteTree(1, toEther(2))],
        ]);
        const nullifierMap2 = new Map<string, NullifierInfo>([
          [nullifier0, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 0, changeIndex: 0 }],
          [nullifier1, { originChainId: TEST_CHAIN_ID.toString(), depositIndex: 1, changeIndex: 0 }],
        ]);

        const result2 = extendAllTrees(
          trees2,
          nullifierMap2,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        // Results should be identical
        const tree0Leaves1 = getLeafNodes(result1.updatedTrees.get(chainKey0)!).length;
        const tree0Leaves2 = getLeafNodes(result2.updatedTrees.get(chainKey0)!).length;
        expect(tree0Leaves1).toBe(tree0Leaves2);

        const tree1Leaves1 = getLeafNodes(result1.updatedTrees.get(chainKey1)!).length;
        const tree1Leaves2 = getLeafNodes(result2.updatedTrees.get(chainKey1)!).length;
        expect(tree1Leaves1).toBe(tree1Leaves2);

        expect(result1.updatedNullifierMap.size).toBe(result2.updatedNullifierMap.size);
      });

      it('should handle out-of-order activities in page', () => {
        const tree = createMockNoteTree(0, toEther(1));
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);
        const nullifierMap = new Map<string, NullifierInfo>();

        // Activities in wrong order (changeIndex 1 before changeIndex 0)
        const activity0 = createMock1x1WithdrawalActivity(0, 0, toEther(0.3));
        const activity1 = createMock1x1WithdrawalActivity(0, 1, toEther(0.2));
        // Put them in reverse order in the array
        const activityIndex = buildActivityIndex([activity1, activity0]);

        const result = extendAllTrees(
          trees,
          nullifierMap,
          activityIndex,
          TEST_ACCOUNT_KEY,
          TEST_POOL_ADDRESS,
        );

        const updatedTree = result.updatedTrees.get(chainKey)!;

        // Should still correctly process in sequential order based on nullifier matching
        // deposit → [change1, withdrawal1] → [change2, withdrawal2]
        expect(updatedTree.root.note.status).toBe('spent');
        expect(updatedTree.root.children).toHaveLength(2); // ChangeNote + WithdrawalNote

        const change1 = updatedTree.root.children.find((c) => c.note.noteType === 'change')!;
        expect(change1.note.changeIndex).toBe(1);
        expect((change1.note as ChangeNote).amount).toBe(toEther(0.7).toString());

        expect(change1.children).toHaveLength(2); // ChangeNote + WithdrawalNote
        const change2 = change1.children.find((c) => c.note.noteType === 'change')!;
        expect(change2.note.changeIndex).toBe(2);
        expect((change2.note as ChangeNote).amount).toBe(toEther(0.5).toString());
      });
    });
  });
});
