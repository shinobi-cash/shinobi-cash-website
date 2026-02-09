/**
 * Tests for reconciler.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reconcileTrees } from '../../src/discovery/reconciler.js';
import { buildActivityIndex } from '../../src/discovery/activity-indexer.js';
import type { NoteTree, DepositNote, DepositIntentNote, WithdrawalIntentNote, ChainKey } from '../../src/discovery/types.js';
import { makeChainKey } from '../../src/discovery/types.js';
import {
  createMockDepositActivity,
  createMockCrossChainDepositActivity,
  createMockCrossChainWithdrawalActivity,
  createMockDepositNote,
  createMockChangeNote,
  createMockWithdrawalIntentNote,
  createMockDepositIntentNote,
  createMockNoteTree,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  TEST_CHAIN_ID,
  toEther,
} from './fixtures.js';
import { createNoteTree, addChild, findNode, getLeafNodes, traverseTree } from '../../src/discovery/tree-utils.js';

describe('reconciler', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  describe('reconcileTrees', () => {
    describe('ASP status updates', () => {
      it('should update ASP status on deposit note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { aspStatus: 'pending' });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), { aspStatus: 'approved' });

        reconcileTrees(trees, [activity]);

        expect(tree.root.note.aspStatus).toBe('approved');
      });

      it('should propagate ASP status to all notes in tree', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { aspStatus: 'pending', status: 'spent' });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5), { aspStatus: 'pending' });
        const tree = createNoteTree(depositNote);
        addChild(tree.root, changeNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), { aspStatus: 'rejected' });

        reconcileTrees(trees, [activity]);

        expect(tree.root.note.aspStatus).toBe('rejected');
        expect(tree.root.children[0].note.aspStatus).toBe('rejected');
      });

      it('should not update if ASP status unchanged', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { aspStatus: 'approved' });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), { aspStatus: 'approved' });

        reconcileTrees(trees, [activity]);

        expect(tree.root.note.aspStatus).toBe('approved');
      });
    });

    describe('intent status updates', () => {
      it('should update intent status on deposit note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), {
          isCrossChain: true,
          intentStatus: 'pending',
        });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), {
          type: 'CROSSCHAIN_DEPOSIT',
          intentStatus: 'filled',
        });

        reconcileTrees(trees, [activity]);

        expect((tree.root.note as DepositNote).intentStatus).toBe('filled');
      });

      it('should not update intent status on non-deposit notes', () => {
        const depositNote = createMockDepositNote(0, toEther(1), {
          isCrossChain: true,
          intentStatus: 'pending',
          status: 'spent',
        });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5), {
          isCrossChain: true,
          intentStatus: 'pending',
        });
        const tree = createNoteTree(depositNote);
        addChild(tree.root, changeNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), {
          type: 'CROSSCHAIN_DEPOSIT',
          intentStatus: 'filled',
        });

        reconcileTrees(trees, [activity]);

        // Only deposit note gets intent update
        expect((tree.root.note as DepositNote).intentStatus).toBe('filled');
        // Change note keeps original (intent only on deposit)
        expect(tree.root.children[0].note.intentStatus).toBe('pending');
      });
    });

    describe('label updates', () => {
      it('should update label on deposit note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: undefined });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), { label: BigInt(12345) });

        reconcileTrees(trees, [activity]);

        expect(tree.root.note.label).toBe('12345');
      });

      it('should propagate label to change notes', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: undefined, status: 'spent' });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5), { label: undefined });
        const tree = createNoteTree(depositNote);
        addChild(tree.root, changeNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), { label: BigInt(12345) });

        reconcileTrees(trees, [activity]);

        expect(tree.root.note.label).toBe('12345');
        expect(tree.root.children[0].note.label).toBe('12345');
      });

      it('should not update if label unchanged', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: '12345' });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Different label value triggers update
        const activity = createMockDepositActivity(0, toEther(1), { label: BigInt(99999) });

        reconcileTrees(trees, [activity]);

        expect(tree.root.note.label).toBe('99999');
      });
    });

    describe('early exit when nothing changed', () => {
      it('should skip update when asp, intent, and label are all unchanged', () => {
        const depositNote = createMockDepositNote(0, toEther(1), {
          aspStatus: 'approved',
          intentStatus: undefined,
          label: undefined,
        });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), {
          aspStatus: 'approved',
          intentStatus: undefined,
          label: undefined,
        });

        reconcileTrees(trees, [activity]);

        expect(tree.root.note.aspStatus).toBe('approved');
      });
    });

    describe('edge cases', () => {
      it('should handle empty trees map', () => {
        const trees = new Map<ChainKey, NoteTree>();

        expect(() => reconcileTrees(trees, [])).not.toThrow();
      });

      it('should handle tree with non-deposit root', () => {
        // Create tree with change note as root (shouldn't happen in practice)
        const changeNote = createMockChangeNote(0, 1, toEther(0.5));
        const tree = createNoteTree(changeNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        expect(() => reconcileTrees(trees, [])).not.toThrow();
      });

      it('should handle activities without matching precommitment', () => {
        const depositNote = createMockDepositNote(0, toEther(1));
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Activity for different deposit
        const activity = createMockDepositActivity(1, toEther(2));

        reconcileTrees(trees, [activity]);

        expect(tree.root.note.aspStatus).toBe('approved');
      });

      it('should skip activities that are not deposits', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { aspStatus: 'pending' });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const withdrawal = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5));

        reconcileTrees(trees, [withdrawal]);

        expect(tree.root.note.aspStatus).toBe('pending');
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

      const tree = createNoteTree(depositNote);
      addChild(tree.root, changeNote);
      addChild(tree.root, withdrawalIntent); // Sibling of change note
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-123',
        intentStatus: 'filled',
      });
      const activityIndex = buildActivityIndex([activity]);

      reconcileTrees(trees, [], activityIndex);

      const intentNode = findNode(tree, (n) => n.note.noteType === 'withdrawalIntent');
      expect(intentNode).toBeDefined();
      expect((intentNode!.note as WithdrawalIntentNote).intentStatus).toBe('filled');
      expect(intentNode!.note.status).toBe('spent');
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

      const tree = createNoteTree(depositNote);
      addChild(tree.root, changeNote);
      addChild(tree.root, withdrawalIntent);
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-456',
        intentStatus: 'refunded',
      });
      const activityIndex = buildActivityIndex([activity]);

      reconcileTrees(trees, [], activityIndex);

      // Find intent node
      const intentNode = findNode(tree, (n) => n.note.noteType === 'withdrawalIntent');
      expect(intentNode).toBeDefined();
      expect((intentNode!.note as WithdrawalIntentNote).intentStatus).toBe('refunded');
      expect(intentNode!.note.status).toBe('spent');

      // RefundNote should be child of intent node
      expect(intentNode!.children).toHaveLength(1);
      const refundNode = intentNode!.children[0];
      expect(refundNode.note.noteType).toBe('refund');
      expect(refundNode.note.amount).toBe(toEther(0.5).toString());
      expect(refundNode.note.status).toBe('unspent');
    });

    it('should not create duplicate RefundNote (idempotency)', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const changeNote = createMockChangeNote(0, 1, toEther(0), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-789',
        intentStatus: 'pending',
        status: 'unspent',
      });

      const tree = createNoteTree(depositNote);
      addChild(tree.root, changeNote);
      addChild(tree.root, withdrawalIntent);
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-789',
        intentStatus: 'refunded',
      });
      const activityIndex = buildActivityIndex([activity]);

      // First reconcile
      reconcileTrees(trees, [], activityIndex);
      const intentNode = findNode(tree, (n) => n.note.noteType === 'withdrawalIntent');
      expect(intentNode!.children).toHaveLength(1);

      // Reset intent status to simulate re-processing
      (intentNode!.note as WithdrawalIntentNote).intentStatus = 'pending';
      intentNode!.note.status = 'unspent';

      // Second reconcile - should NOT create duplicate RefundNote
      reconcileTrees(trees, [], activityIndex);
      expect(intentNode!.children).toHaveLength(1); // Still 1, not 2
    });

    it('should skip WithdrawalIntentNote without orderId', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: '',
        intentStatus: 'pending',
      });

      const tree = createNoteTree(depositNote);
      addChild(tree.root, withdrawalIntent);
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      const activityIndex = buildActivityIndex([]);

      reconcileTrees(trees, [], activityIndex);

      const intentNode = findNode(tree, (n) => n.note.noteType === 'withdrawalIntent');
      expect((intentNode!.note as WithdrawalIntentNote).intentStatus).toBe('pending');
    });

    it('should skip if no matching activity for orderId', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-no-match',
        intentStatus: 'pending',
      });

      const tree = createNoteTree(depositNote);
      addChild(tree.root, withdrawalIntent);
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-different',
        intentStatus: 'filled',
      });
      const activityIndex = buildActivityIndex([activity]);

      reconcileTrees(trees, [], activityIndex);

      const intentNode = findNode(tree, (n) => n.note.noteType === 'withdrawalIntent');
      expect((intentNode!.note as WithdrawalIntentNote).intentStatus).toBe('pending');
    });

    it('should skip if intent status unchanged', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-same',
        intentStatus: 'filled',
        status: 'spent',
      });

      const tree = createNoteTree(depositNote);
      addChild(tree.root, withdrawalIntent);
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
        orderId: 'order-same',
        intentStatus: 'filled',
      });
      const activityIndex = buildActivityIndex([activity]);

      reconcileTrees(trees, [], activityIndex);

      // No RefundNote added
      const intentNode = findNode(tree, (n) => n.note.noteType === 'withdrawalIntent');
      expect(intentNode!.children).toHaveLength(0);
    });

    it('should handle multiple WithdrawalIntentNotes in same tree', () => {
      // Build a more complex tree structure
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

      const tree = createNoteTree(depositNote);
      const change1Node = addChild(tree.root, change1);
      addChild(tree.root, intent1); // First intent as sibling of change1
      const change2Node = addChild(change1Node, change2);
      addChild(change1Node, intent2); // Second intent as sibling of change2

      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

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

      reconcileTrees(trees, [], activityIndex);

      // Find intent nodes
      const intent1Node = findNode(tree, (n) => n.note.orderId === 'order-A');
      const intent2Node = findNode(tree, (n) => n.note.orderId === 'order-B');

      // First intent should be filled
      expect((intent1Node!.note as WithdrawalIntentNote).intentStatus).toBe('filled');
      expect(intent1Node!.note.status).toBe('spent');

      // Second intent should be refunded with RefundNote
      expect((intent2Node!.note as WithdrawalIntentNote).intentStatus).toBe('refunded');
      expect(intent2Node!.note.status).toBe('spent');
      expect(intent2Node!.children).toHaveLength(1);
      expect(intent2Node!.children[0].note.noteType).toBe('refund');
    });

    describe('deposit intent reconciliation', () => {
      it('should create DepositNote when deposit intent is filled', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-123',
          intentStatus: 'pending',
          status: 'unspent',
          originChainId: '84532',
          destinationChainId: '421614',
        });
        const tree = createNoteTree(depositIntent);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-123',
          intentStatus: 'filled',
        });
        const activityIndex = buildActivityIndex([activity]);

        const result = reconcileTrees(trees, [], activityIndex);

        // DepositIntentNote should be marked as spent
        expect((tree.root.note as DepositIntentNote).intentStatus).toBe('filled');
        expect(tree.root.note.status).toBe('spent');

        // DepositNote should be created as child
        expect(tree.root.children).toHaveLength(1);
        const depositNode = tree.root.children[0];
        expect(depositNode.note.noteType).toBe('deposit');
        expect(depositNode.note.amount).toBe(toEther(1).toString());
        expect(depositNode.note.status).toBe('unspent');

        // Should return filled deposit index
        expect(result.filledDepositIndices).toHaveLength(1);
        expect(result.filledDepositIndices[0].depositIndex).toBe(0);
        expect(result.filledDepositIndices[0].poolAddress).toBe(TEST_POOL_ADDRESS);
        expect(result.filledDepositIndices[0].originChainId).toBe('84532');
      });

      it('should mark deposit as spent when refunded', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-456',
          intentStatus: 'pending',
          status: 'unspent',
        });
        const tree = createNoteTree(depositIntent);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-456',
          intentStatus: 'refunded',
        });
        const activityIndex = buildActivityIndex([activity]);

        const result = reconcileTrees(trees, [], activityIndex);

        expect((tree.root.note as DepositIntentNote).intentStatus).toBe('refunded');
        expect(tree.root.note.status).toBe('spent');

        // No DepositNote created
        expect(tree.root.children).toHaveLength(0);

        // No filled deposit indices
        expect(result.filledDepositIndices).toHaveLength(0);
      });

      it('should not create duplicate DepositNote (idempotency)', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-idempotent',
          intentStatus: 'pending',
          status: 'unspent',
        });
        const tree = createNoteTree(depositIntent);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-idempotent',
          intentStatus: 'filled',
        });
        const activityIndex = buildActivityIndex([activity]);

        // First reconcile
        reconcileTrees(trees, [], activityIndex);
        expect(tree.root.children).toHaveLength(1);

        // Reset to simulate re-processing
        (tree.root.note as DepositIntentNote).intentStatus = 'pending';
        tree.root.note.status = 'unspent';

        // Second reconcile - should NOT create duplicate
        reconcileTrees(trees, [], activityIndex);
        expect(tree.root.children).toHaveLength(1);
      });

      it('should skip if deposit intent status unchanged', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-unchanged',
          intentStatus: 'filled',
          status: 'spent',
        });
        const tree = createNoteTree(depositIntent);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-unchanged',
          intentStatus: 'filled',
        });
        const activityIndex = buildActivityIndex([activity]);

        const result = reconcileTrees(trees, [], activityIndex);

        expect(tree.root.children).toHaveLength(0);
        expect(result.filledDepositIndices).toHaveLength(0);
      });
    });

    describe('cross-chain withdrawal lifecycle', () => {
      it('should handle pending → filled', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5));
        const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
          orderId: 'withdrawal-order-filled',
          intentStatus: 'pending',
          status: 'unspent',
        });

        const tree = createNoteTree(depositNote);
        addChild(tree.root, changeNote);
        addChild(tree.root, withdrawalIntent);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
          orderId: 'withdrawal-order-filled',
          intentStatus: 'filled',
        });
        const activityIndex = buildActivityIndex([activity]);

        reconcileTrees(trees, [], activityIndex);

        const intentNode = findNode(tree, (n) => n.note.noteType === 'withdrawalIntent');
        expect((intentNode!.note as WithdrawalIntentNote).intentStatus).toBe('filled');
        expect(intentNode!.note.status).toBe('spent');
        // No RefundNote for filled intents
        expect(intentNode!.children).toHaveLength(0);
      });

      it('should handle pending → refunded', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5));
        const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
          orderId: 'withdrawal-order-refunded',
          intentStatus: 'pending',
          status: 'unspent',
          refundCommitment: '0xrefund-commitment-123',
        });

        const tree = createNoteTree(depositNote);
        addChild(tree.root, changeNote);
        addChild(tree.root, withdrawalIntent);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockCrossChainWithdrawalActivity(0, 0, toEther(0.5), {
          orderId: 'withdrawal-order-refunded',
          intentStatus: 'refunded',
        });
        const activityIndex = buildActivityIndex([activity]);

        reconcileTrees(trees, [], activityIndex);

        const intentNode = findNode(tree, (n) => n.note.noteType === 'withdrawalIntent');
        expect((intentNode!.note as WithdrawalIntentNote).intentStatus).toBe('refunded');
        expect(intentNode!.note.status).toBe('spent');
        // RefundNote should be child of intent
        expect(intentNode!.children).toHaveLength(1);
        expect(intentNode!.children[0].note.noteType).toBe('refund');
        expect(intentNode!.children[0].note.status).toBe('unspent');
        expect(intentNode!.children[0].note.amount).toBe(toEther(0.5).toString());
      });

      it('should handle deposit intent refund', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'deposit-order-refunded',
          intentStatus: 'pending',
          status: 'unspent',
        });
        const tree = createNoteTree(depositIntent);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'deposit-order-refunded',
          type: 'CROSSCHAIN_DEPOSIT_PENDING',
          intentStatus: 'refunded',
        });
        const activityIndex = buildActivityIndex([activity]);

        reconcileTrees(trees, [], activityIndex);

        expect((tree.root.note as DepositIntentNote).intentStatus).toBe('refunded');
        expect(tree.root.note.status).toBe('spent');
        // No RefundNote for deposit refunds - funds returned to origin chain
        expect(tree.root.children).toHaveLength(0);
      });
    });
  });
});
