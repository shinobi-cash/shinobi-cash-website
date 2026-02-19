/**
 * Tests for reconciler.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reconcileTrees } from '../../src/discovery/reconciler.js';
import { buildActivityIndex } from '../../src/discovery/activity-indexer.js';
import type { NoteTree, DepositNote, ChainKey } from '../../src/discovery/types.js';
import { makeChainKey, isWithdrawalIntent, isDepositIntent } from '../../src/discovery/types.js';
import {
  createMockDepositActivity,
  createMockCrossChainDepositActivity,
  createMockCrossChainWithdrawalActivity,
  createMockCrossChainWithdrawalFillActivity,
  createMockCrossChainWithdrawalRefundActivity,
  createMockCrossChainDepositRefundActivity,
  createMockDepositNote,
  createMockChangeNote,
  createMockWithdrawalIntentNote,
  createMockDepositIntentNote,
  createMockNoteTree,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  TEST_CHAIN_ID,
  TEST_ACCOUNT_KEY,
  toEther,
} from './fixtures.js';
import { deriveDepositPrecommitment } from '../../src/discovery/nullifier-utils.js';
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

      it('should update ASP status on cross-chain deposit (DepositIntentNote root with CrosschainDepositNote child)', () => {
        // Create tree with DepositIntentNote root and CrosschainDepositNote child (filled intent)
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'asp-test-order',
          originChainId: '84532',
          destinationChainId: TEST_CHAIN_ID,
        });
        const tree = createNoteTree(depositIntent);

        // Derive precommitmentHash the same way the activity fixture does
        const precommitmentHash = deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0);

        // Manually add a CrosschainDepositNote child with pending ASP status
        const crosschainDeposit = {
          noteType: 'crosschainDeposit' as const,
          serialNumber: 'BAS-001-00-0-00',
          poolAddress: TEST_POOL_ADDRESS,
          depositIndex: 0,
          changeIndex: 0,
          amount: toEther(1).toString(),
          status: 'unspent' as const,
          aspStatus: 'pending' as const,
          isCrossChain: true,
          originChainId: '84532',
          originTransactionHash: '0xorigin-tx',
          originTimestamp: '1234567890',
          destinationChainId: TEST_CHAIN_ID,
          destinationTransactionHash: '0xdest-tx',
          destinationTimestamp: '1234567900',
          precommitmentHash, // Must match activity - derived using same function
          activityData: {},
        };
        addChild(tree.root, crosschainDeposit);

        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Activity with approved ASP status
        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          aspStatus: 'approved',
          label: '99999',
        });

        reconcileTrees(trees, [activity]);

        // CrosschainDepositNote should have updated ASP status
        const depositChild = tree.root.children[0];
        expect(depositChild.note.aspStatus).toBe('approved');
        expect(depositChild.note.label).toBe('99999');
      });

      it('should propagate ASP status to change notes in cross-chain deposit tree', () => {
        // Create tree with DepositIntentNote root, CrosschainDepositNote, and ChangeNote
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'asp-propagate-order',
          originChainId: '84532',
          destinationChainId: TEST_CHAIN_ID,
        });
        const tree = createNoteTree(depositIntent);

        // Derive precommitmentHash the same way the activity fixture does
        const precommitmentHash = deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0);

        // CrosschainDepositNote child
        const crosschainDeposit = {
          noteType: 'crosschainDeposit' as const,
          serialNumber: 'BAS-001-00-0-00',
          poolAddress: TEST_POOL_ADDRESS,
          depositIndex: 0,
          changeIndex: 0,
          amount: toEther(1).toString(),
          status: 'spent' as const,
          aspStatus: 'pending' as const,
          isCrossChain: true,
          originChainId: '84532',
          originTransactionHash: '0xorigin-tx',
          originTimestamp: '1234567890',
          destinationChainId: TEST_CHAIN_ID,
          destinationTransactionHash: '0xdest-tx',
          destinationTimestamp: '1234567900',
          precommitmentHash, // Must match activity - derived using same function
          activityData: {},
        };
        const depositNode = addChild(tree.root, crosschainDeposit);

        // ChangeNote child of deposit
        const changeNote = createMockChangeNote(0, 1, toEther(0.5), { aspStatus: 'pending' });
        addChild(depositNode, changeNote);

        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Activity with approved ASP status
        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          aspStatus: 'approved',
        });

        reconcileTrees(trees, [activity]);

        // Both CrosschainDepositNote and ChangeNote should have updated ASP status
        expect(tree.root.children[0].note.aspStatus).toBe('approved');
        expect(tree.root.children[0].children[0].note.aspStatus).toBe('approved');
      });

      it('should return matched activities for ASP status updates', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { aspStatus: 'pending' });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), { aspStatus: 'approved' });

        const result = reconcileTrees(trees, [activity]);

        // Activity should be included in matchedActivities for storage
        expect(result.matchedActivities).toHaveLength(1);
        expect(result.matchedActivities[0].txHash).toBe(activity.txHash);
        expect(result.matchedActivities[0].aspStatus).toBe('approved');
      });

      it('should return matched activities for cross-chain deposit ASP updates', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'asp-activity-test',
          originChainId: '84532',
          destinationChainId: TEST_CHAIN_ID,
        });
        const tree = createNoteTree(depositIntent);

        const precommitmentHash = deriveDepositPrecommitment(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0);

        const crosschainDeposit = {
          noteType: 'crosschainDeposit' as const,
          serialNumber: 'BAS-001-00-0-00',
          poolAddress: TEST_POOL_ADDRESS,
          depositIndex: 0,
          changeIndex: 0,
          amount: toEther(1).toString(),
          status: 'unspent' as const,
          aspStatus: 'pending' as const,
          isCrossChain: true,
          originChainId: '84532',
          originTransactionHash: '0xorigin-tx',
          originTimestamp: '1234567890',
          destinationChainId: TEST_CHAIN_ID,
          destinationTransactionHash: '0xdest-tx',
          destinationTimestamp: '1234567900',
          precommitmentHash,
          activityData: {},
        };
        addChild(tree.root, crosschainDeposit);

        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockCrossChainDepositActivity(0, toEther(1), {
          aspStatus: 'approved',
        });

        const result = reconcileTrees(trees, [activity]);

        // Activity should be included in matchedActivities for storage
        expect(result.matchedActivities).toHaveLength(1);
        expect(result.matchedActivities[0].aspStatus).toBe('approved');
      });
    });

    // Intent notes (DepositIntentNote, WithdrawalIntentNote) are reconciled separately
    // via reconcileIntentNotes with the activityIndex parameter

    describe('label updates', () => {
      it('should update label on deposit note', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { label: undefined });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), { label: '12345' });

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

        const activity = createMockDepositActivity(0, toEther(1), { label: '12345' });

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
        const activity = createMockDepositActivity(0, toEther(1), { label: '99999' });

        reconcileTrees(trees, [activity]);

        expect(tree.root.note.label).toBe('99999');
      });
    });

    describe('early exit when nothing changed', () => {
      it('should skip update when asp and label are all unchanged', () => {
        const depositNote = createMockDepositNote(0, toEther(1), {
          aspStatus: 'approved',
          label: undefined,
        });
        const tree = createNoteTree(depositNote);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        const activity = createMockDepositActivity(0, toEther(1), {
          aspStatus: 'approved',
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
    it('should create CrosschainWithdrawalNote when withdrawal intent filled', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const changeNote = createMockChangeNote(0, 1, toEther(0), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-withdraw-0-0',
      });

      const tree = createNoteTree(depositNote);
      addChild(tree.root, changeNote);
      addChild(tree.root, withdrawalIntent); // Sibling of change note
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      // Use fill activity type for filled intents
      const fillActivity = createMockCrossChainWithdrawalFillActivity(0, 0, toEther(0.5), {
        orderId: 'order-withdraw-0-0',
      });
      const activityIndex = buildActivityIndex([fillActivity]);

      reconcileTrees(trees, [], activityIndex);

      const intentNode = findNode(tree, (n) => isWithdrawalIntent(n.note));
      expect(intentNode).toBeDefined();
      // Intent note should have CrosschainWithdrawalNote child when filled
      expect(intentNode!.children).toHaveLength(1);
      expect(intentNode!.children[0].note.noteType).toBe('crosschainWithdrawal');
      expect(intentNode!.children[0].isTerminal).toBe(true);
    });

    it('should create WithdrawalRefundedNote when withdrawal intent refunded', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent', label: 'my-label', aspStatus: 'approved' });
      const changeNote = createMockChangeNote(0, 1, toEther(0), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-withdraw-0-0',
        refundCommitment: '0xrefund-0-0',
      });

      const tree = createNoteTree(depositNote);
      addChild(tree.root, changeNote);
      addChild(tree.root, withdrawalIntent);
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      // Use refund activity type for refunded intents
      const refundActivity = createMockCrossChainWithdrawalRefundActivity(0, 0, toEther(0.5), {
        orderId: 'order-withdraw-0-0',
        refundCommitment: '0xrefund-0-0',
      });
      const activityIndex = buildActivityIndex([refundActivity]);

      reconcileTrees(trees, [], activityIndex);

      // Find intent node
      const intentNode = findNode(tree, (n) => isWithdrawalIntent(n.note));
      expect(intentNode).toBeDefined();

      // WithdrawalRefundedNote should be child of intent node
      expect(intentNode!.children).toHaveLength(1);
      const refundNode = intentNode!.children[0];
      expect(refundNode.note.noteType).toBe('withdrawalRefunded');
      expect(refundNode.note.amount).toBe(toEther(0.5).toString());
      // Refund note is spendable with label/aspStatus from parent
      expect((refundNode.note as DepositNote).status).toBe('unspent');
    });

    it('should not create duplicate child notes (idempotency)', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const changeNote = createMockChangeNote(0, 1, toEther(0), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-withdraw-0-0',
        refundCommitment: '0xrefund-0-0',
      });

      const tree = createNoteTree(depositNote);
      addChild(tree.root, changeNote);
      addChild(tree.root, withdrawalIntent);
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      // Use refund activity type for refunded intents
      const refundActivity = createMockCrossChainWithdrawalRefundActivity(0, 0, toEther(0.5), {
        orderId: 'order-withdraw-0-0',
        refundCommitment: '0xrefund-0-0',
      });
      const activityIndex = buildActivityIndex([refundActivity]);

      // First reconcile
      reconcileTrees(trees, [], activityIndex);
      const intentNode = findNode(tree, (n) => isWithdrawalIntent(n.note));
      expect(intentNode!.children).toHaveLength(1);

      // Second reconcile - should NOT create duplicate (checked by children.length > 0)
      reconcileTrees(trees, [], activityIndex);
      expect(intentNode!.children).toHaveLength(1); // Still 1, not 2
    });

    it('should skip WithdrawalIntentNote without orderId', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: '',
      });

      const tree = createNoteTree(depositNote);
      addChild(tree.root, withdrawalIntent);
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      const activityIndex = buildActivityIndex([]);

      reconcileTrees(trees, [], activityIndex);

      const intentNode = findNode(tree, (n) => isWithdrawalIntent(n.note));
      // No children added when orderId is empty
      expect(intentNode!.children).toHaveLength(0);
    });

    it('should skip if no matching activity for orderId', () => {
      const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
      const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-no-match',
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

      const intentNode = findNode(tree, (n) => isWithdrawalIntent(n.note));
      // No children added when orderId doesn't match
      expect(intentNode!.children).toHaveLength(0);
    });

    it('should handle multiple WithdrawalIntentNotes in same tree', () => {
      // Build a more complex tree structure
      const depositNote = createMockDepositNote(0, toEther(2), { status: 'spent', label: 'my-label', aspStatus: 'approved' });
      const change1 = createMockChangeNote(0, 1, toEther(1), { status: 'spent' });
      const intent1 = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
        orderId: 'order-A',
      });
      const change2 = createMockChangeNote(0, 2, toEther(0.5), { status: 'spent' });
      const intent2 = createMockWithdrawalIntentNote(0, 1, toEther(0.3), {
        orderId: 'order-B',
        refundCommitment: '0xrefund-B',
      });

      const tree = createNoteTree(depositNote);
      const change1Node = addChild(tree.root, change1);
      addChild(tree.root, intent1); // First intent as sibling of change1
      addChild(change1Node, change2);
      addChild(change1Node, intent2); // Second intent as sibling of change2

      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

      // Use fill and refund activities
      const fillActivityA = createMockCrossChainWithdrawalFillActivity(0, 0, toEther(0.5), {
        orderId: 'order-A',
      });
      const refundActivityB = createMockCrossChainWithdrawalRefundActivity(0, 1, toEther(0.3), {
        orderId: 'order-B',
        refundCommitment: '0xrefund-B',
      });
      const activityIndex = buildActivityIndex([fillActivityA, refundActivityB]);

      reconcileTrees(trees, [], activityIndex);

      // Find intent nodes by orderId
      const intent1Node = findNode(tree, (n) => isWithdrawalIntent(n.note) && (n.note as any).orderId === 'order-A');
      const intent2Node = findNode(tree, (n) => isWithdrawalIntent(n.note) && (n.note as any).orderId === 'order-B');

      // First intent should have CrosschainWithdrawalNote child
      expect(intent1Node!.children).toHaveLength(1);
      expect(intent1Node!.children[0].note.noteType).toBe('crosschainWithdrawal');

      // Second intent should have WithdrawalRefundedNote child
      expect(intent2Node!.children).toHaveLength(1);
      expect(intent2Node!.children[0].note.noteType).toBe('withdrawalRefunded');
    });

    describe('deposit intent reconciliation', () => {
      it('should create CrosschainDepositNote when deposit intent is filled', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'order-pending-0',
          originChainId: '84532',
          destinationChainId: '421614',
        });
        const tree = createNoteTree(depositIntent);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Use fill activity type for filled deposit intents
        const fillActivity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'order-pending-0',
        });
        const activityIndex = buildActivityIndex([fillActivity]);

        const result = reconcileTrees(trees, [], activityIndex);

        // CrosschainDepositNote should be created as child
        expect(tree.root.children).toHaveLength(1);
        const depositNode = tree.root.children[0];
        expect(depositNode.note.noteType).toBe('crosschainDeposit');
        expect(depositNode.note.amount).toBe(toEther(1).toString());
        expect((depositNode.note as DepositNote).status).toBe('unspent');

        // Should return filled deposit index
        expect(result.filledDepositIndices).toHaveLength(1);
        expect(result.filledDepositIndices[0].depositIndex).toBe(0);
        expect(result.filledDepositIndices[0].poolAddress).toBe(TEST_POOL_ADDRESS);
        expect(result.filledDepositIndices[0].originChainId).toBe('84532');
      });

      it('should create DepositRefundedNote when deposit refunded', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'order-pending-0',
        });
        const tree = createNoteTree(depositIntent);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Use refund activity type for refunded deposit intents
        const refundActivity = createMockCrossChainDepositRefundActivity(0, {
          orderId: 'order-pending-0',
        });
        const activityIndex = buildActivityIndex([refundActivity]);

        const result = reconcileTrees(trees, [], activityIndex);

        // DepositRefundedNote should be created as child (terminal)
        expect(tree.root.children).toHaveLength(1);
        const refundedNode = tree.root.children[0];
        expect(refundedNode.note.noteType).toBe('depositRefunded');
        expect(refundedNode.isTerminal).toBe(true);

        // No filled deposit indices
        expect(result.filledDepositIndices).toHaveLength(0);
      });

      it('should not create duplicate child notes (idempotency)', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'order-pending-0',
        });
        const tree = createNoteTree(depositIntent);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Use fill activity type
        const fillActivity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'order-pending-0',
        });
        const activityIndex = buildActivityIndex([fillActivity]);

        // First reconcile
        reconcileTrees(trees, [], activityIndex);
        expect(tree.root.children).toHaveLength(1);

        // Second reconcile - should NOT create duplicate (checked by children.length > 0)
        reconcileTrees(trees, [], activityIndex);
        expect(tree.root.children).toHaveLength(1);
      });

      it('should skip if already resolved (has children)', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'order-pending-0',
        });
        const tree = createNoteTree(depositIntent);
        // Manually add a child to simulate already-resolved intent
        const existingChild = createMockDepositNote(0, toEther(1));
        addChild(tree.root, existingChild);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Use fill activity type
        const fillActivity = createMockCrossChainDepositActivity(0, toEther(1), {
          orderId: 'order-pending-0',
        });
        const activityIndex = buildActivityIndex([fillActivity]);

        const result = reconcileTrees(trees, [], activityIndex);

        // No new children added
        expect(tree.root.children).toHaveLength(1);
        expect(result.filledDepositIndices).toHaveLength(0);
      });
    });

    describe('cross-chain withdrawal lifecycle', () => {
      it('should handle pending → filled', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent' });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5));
        const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
          orderId: 'order-withdraw-0-0',
        });

        const tree = createNoteTree(depositNote);
        addChild(tree.root, changeNote);
        addChild(tree.root, withdrawalIntent);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Use fill activity type
        const fillActivity = createMockCrossChainWithdrawalFillActivity(0, 0, toEther(0.5), {
          orderId: 'order-withdraw-0-0',
        });
        const activityIndex = buildActivityIndex([fillActivity]);

        reconcileTrees(trees, [], activityIndex);

        const intentNode = findNode(tree, (n) => isWithdrawalIntent(n.note));
        // CrosschainWithdrawalNote is created as child (terminal record of delivery)
        expect(intentNode!.children).toHaveLength(1);
        expect(intentNode!.children[0].note.noteType).toBe('crosschainWithdrawal');
        expect(intentNode!.children[0].isTerminal).toBe(true);
      });

      it('should handle pending → refunded', () => {
        const depositNote = createMockDepositNote(0, toEther(1), { status: 'spent', label: 'my-label', aspStatus: 'approved' });
        const changeNote = createMockChangeNote(0, 1, toEther(0.5));
        const withdrawalIntent = createMockWithdrawalIntentNote(0, 0, toEther(0.5), {
          orderId: 'order-withdraw-0-0',
          refundCommitment: '0xrefund-0-0',
        });

        const tree = createNoteTree(depositNote);
        addChild(tree.root, changeNote);
        addChild(tree.root, withdrawalIntent);
        const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Use refund activity type
        const refundActivity = createMockCrossChainWithdrawalRefundActivity(0, 0, toEther(0.5), {
          orderId: 'order-withdraw-0-0',
          refundCommitment: '0xrefund-0-0',
        });
        const activityIndex = buildActivityIndex([refundActivity]);

        reconcileTrees(trees, [], activityIndex);

        const intentNode = findNode(tree, (n) => isWithdrawalIntent(n.note));
        // WithdrawalRefundedNote should be child of intent
        expect(intentNode!.children).toHaveLength(1);
        expect(intentNode!.children[0].note.noteType).toBe('withdrawalRefunded');
        // WithdrawalRefundedNote is spendable
        expect((intentNode!.children[0].note as DepositNote).status).toBe('unspent');
        expect(intentNode!.children[0].note.amount).toBe(toEther(0.5).toString());
      });

      it('should handle deposit intent refund', () => {
        const depositIntent = createMockDepositIntentNote(0, toEther(1), {
          orderId: 'order-pending-0',
        });
        const tree = createNoteTree(depositIntent);
        const chainKey = makeChainKey('84532', 0);
        const trees = new Map<ChainKey, NoteTree>([[chainKey, tree]]);

        // Use refund activity type
        const refundActivity = createMockCrossChainDepositRefundActivity(0, {
          orderId: 'order-pending-0',
        });
        const activityIndex = buildActivityIndex([refundActivity]);

        reconcileTrees(trees, [], activityIndex);

        // DepositRefundedNote created as child (terminal - funds returned to origin chain)
        expect(tree.root.children).toHaveLength(1);
        expect(tree.root.children[0].note.noteType).toBe('depositRefunded');
        expect(tree.root.children[0].isTerminal).toBe(true);
      });
    });
  });
});
