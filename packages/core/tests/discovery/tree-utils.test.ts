/**
 * Tests for tree-utils.ts
 * Tree utilities for NoteTree operations
 */

import { describe, it, expect } from 'vitest';
import {
  createNoteTree,
  createNoteNode,
  addChild,
  findNode,
  findNodeByPosition,
  findNodeByOrderId,
  getLeafNodes,
  getSpendableLeaves,
  getLastSpendableLeaf,
  getTotalSpendableBalance,
  traverseTree,
  markTerminal,
  serializeTree,
  deserializeTree,
  selectWinnerChain,
} from '../../src/discovery/tree-utils.js';
import {
  createMockDepositNote,
  createMockChangeNote,
  createMockWithdrawalIntentNote,
  createMockRefundNote,
} from './fixtures.js';

describe('tree-utils', () => {
  describe('createNoteTree', () => {
    it('should create a tree with root node', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000');
      const tree = createNoteTree(deposit);

      expect(tree.root).toBeDefined();
      expect(tree.root.note).toBe(deposit);
      expect(tree.root.parent).toBeNull();
      expect(tree.root.children).toHaveLength(0);
      expect(tree.root.isTerminal).toBe(false);
    });

    it('should create terminal root for ragequit note', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'ragequit' });
      const tree = createNoteTree(deposit);

      expect(tree.root.isTerminal).toBe(true);
    });

    it('should create terminal root for merged note', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'merged' });
      const tree = createNoteTree(deposit);

      expect(tree.root.isTerminal).toBe(true);
    });
  });

  describe('createNoteNode', () => {
    it('should create node with parent reference', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000');
      const change = createMockChangeNote(0, 1, '500000000000000000');

      const parentNode = createNoteNode(deposit, null);
      const childNode = createNoteNode(change, parentNode);

      expect(childNode.parent).toBe(parentNode);
      expect(childNode.note).toBe(change);
    });
  });

  describe('addChild', () => {
    it('should add child to parent node', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000');
      const change = createMockChangeNote(0, 1, '500000000000000000');

      const tree = createNoteTree(deposit);
      const childNode = addChild(tree.root, change);

      expect(tree.root.children).toHaveLength(1);
      expect(tree.root.children[0]).toBe(childNode);
      expect(childNode.parent).toBe(tree.root);
    });

    it('should throw when adding child to terminal node', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'ragequit' });
      const change = createMockChangeNote(0, 1, '500000000000000000');

      const tree = createNoteTree(deposit);

      expect(() => addChild(tree.root, change)).toThrow('Cannot add child to terminal node');
    });

    it('should support multiple children (siblings)', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change = createMockChangeNote(0, 1, '500000000000000000');
      const intent = createMockWithdrawalIntentNote(0, 0, '500000000000000000');

      const tree = createNoteTree(deposit);
      const changeNode = addChild(tree.root, change);
      const intentNode = addChild(tree.root, intent);

      expect(tree.root.children).toHaveLength(2);
      expect(changeNode.parent).toBe(tree.root);
      expect(intentNode.parent).toBe(tree.root);
    });
  });

  describe('findNode', () => {
    it('should find node by predicate', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change = createMockChangeNote(0, 1, '500000000000000000');

      const tree = createNoteTree(deposit);
      addChild(tree.root, change);

      const found = findNode(tree, (node) => node.note.changeIndex === 1);
      expect(found).toBeDefined();
      expect(found?.note).toEqual(change);
    });

    it('should return null when not found', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000');
      const tree = createNoteTree(deposit);

      const found = findNode(tree, (node) => node.note.changeIndex === 99);
      expect(found).toBeNull();
    });
  });

  describe('findNodeByPosition', () => {
    it('should find node by depositIndex and changeIndex', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change1 = createMockChangeNote(0, 1, '500000000000000000', { status: 'spent' });
      const change2 = createMockChangeNote(0, 2, '300000000000000000');

      const tree = createNoteTree(deposit);
      const change1Node = addChild(tree.root, change1);
      addChild(change1Node, change2);

      const found = findNodeByPosition(tree, 0, 2);
      expect(found).toBeDefined();
      expect(found?.note.changeIndex).toBe(2);
    });
  });

  describe('findNodeByOrderId', () => {
    it('should find withdrawal intent by orderId', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change = createMockChangeNote(0, 1, '500000000000000000');
      const intent = createMockWithdrawalIntentNote(0, 0, '500000000000000000', {
        orderId: 'test-order-123',
      });

      const tree = createNoteTree(deposit);
      addChild(tree.root, change);
      addChild(tree.root, intent);

      const found = findNodeByOrderId(tree, 'test-order-123');
      expect(found).toBeDefined();
      expect(found?.note.orderId).toBe('test-order-123');
    });
  });

  describe('getLeafNodes', () => {
    it('should return all leaf nodes', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change = createMockChangeNote(0, 1, '500000000000000000');
      const intent = createMockWithdrawalIntentNote(0, 0, '500000000000000000');

      const tree = createNoteTree(deposit);
      addChild(tree.root, change);
      addChild(tree.root, intent);

      const leaves = getLeafNodes(tree);
      expect(leaves).toHaveLength(2);
    });

    it('should return root if no children', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000');
      const tree = createNoteTree(deposit);

      const leaves = getLeafNodes(tree);
      expect(leaves).toHaveLength(1);
      expect(leaves[0].note).toBe(deposit);
    });
  });

  describe('getSpendableLeaves', () => {
    it('should return only spendable leaves', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change = createMockChangeNote(0, 1, '500000000000000000', { status: 'unspent' });
      const intent = createMockWithdrawalIntentNote(0, 0, '500000000000000000', { status: 'spent' });
      const refund = createMockRefundNote(0, 1, '500000000000000000', { status: 'unspent' });

      const tree = createNoteTree(deposit);
      addChild(tree.root, change);
      const intentNode = addChild(tree.root, intent);
      addChild(intentNode, refund);

      const spendable = getSpendableLeaves(tree);

      // Both change and refund are spendable (unspent with positive balance)
      expect(spendable).toHaveLength(2);
      expect(spendable.map((n) => n.note.noteType).sort()).toEqual(['change', 'refund']);
    });

    it('should exclude zero balance notes', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change = createMockChangeNote(0, 1, '0', { status: 'unspent' });

      const tree = createNoteTree(deposit);
      addChild(tree.root, change);

      const spendable = getSpendableLeaves(tree);
      expect(spendable).toHaveLength(0);
    });

    it('should exclude terminal nodes', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'ragequit' });
      const tree = createNoteTree(deposit);

      const spendable = getSpendableLeaves(tree);
      expect(spendable).toHaveLength(0);
    });
  });

  describe('getLastSpendableLeaf', () => {
    it('should return most recent spendable leaf by timestamp', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change = createMockChangeNote(0, 1, '500000000000000000', {
        status: 'unspent',
        timestamp: '1700000000',
      });
      const intent = createMockWithdrawalIntentNote(0, 0, '500000000000000000', { status: 'spent' });
      const refund = createMockRefundNote(0, 1, '500000000000000000', {
        status: 'unspent',
        timestamp: '1700001000', // More recent
      });

      const tree = createNoteTree(deposit);
      addChild(tree.root, change);
      const intentNode = addChild(tree.root, intent);
      addChild(intentNode, refund);

      const lastSpendable = getLastSpendableLeaf(tree);
      expect(lastSpendable).toBeDefined();
      expect(lastSpendable?.note.noteType).toBe('refund');
    });

    it('should return null if no spendable leaves', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const tree = createNoteTree(deposit);

      const lastSpendable = getLastSpendableLeaf(tree);
      expect(lastSpendable).toBeNull();
    });
  });

  describe('getTotalSpendableBalance', () => {
    it('should sum all spendable leaf balances', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change = createMockChangeNote(0, 1, '500000000000000000', { status: 'unspent' });
      const intent = createMockWithdrawalIntentNote(0, 0, '300000000000000000', { status: 'spent' });
      const refund = createMockRefundNote(0, 1, '300000000000000000', { status: 'unspent' });

      const tree = createNoteTree(deposit);
      addChild(tree.root, change);
      const intentNode = addChild(tree.root, intent);
      addChild(intentNode, refund);

      const total = getTotalSpendableBalance(tree);
      // 0.5 ETH + 0.3 ETH = 0.8 ETH
      expect(total).toBe(BigInt('800000000000000000'));
    });
  });

  describe('traverseTree', () => {
    it('should traverse in depth-first order', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change1 = createMockChangeNote(0, 1, '500000000000000000', { status: 'spent' });
      const change2 = createMockChangeNote(0, 2, '300000000000000000');

      const tree = createNoteTree(deposit);
      const change1Node = addChild(tree.root, change1);
      addChild(change1Node, change2);

      const visited: Array<{ changeIndex: number; depth: number }> = [];
      traverseTree(tree, (node, depth) => {
        visited.push({ changeIndex: node.note.changeIndex, depth });
      });

      expect(visited).toEqual([
        { changeIndex: 0, depth: 0 },
        { changeIndex: 1, depth: 1 },
        { changeIndex: 2, depth: 2 },
      ]);
    });
  });

  describe('markTerminal', () => {
    it('should mark node as terminal', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000');
      const tree = createNoteTree(deposit);

      expect(tree.root.isTerminal).toBe(false);
      markTerminal(tree.root);
      expect(tree.root.isTerminal).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize tree', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const change = createMockChangeNote(0, 1, '500000000000000000');
      const intent = createMockWithdrawalIntentNote(0, 0, '500000000000000000');

      const tree = createNoteTree(deposit);
      addChild(tree.root, change);
      addChild(tree.root, intent);

      const serialized = serializeTree(tree);
      const deserialized = deserializeTree(serialized);

      expect(deserialized.root.note).toEqual(deposit);
      expect(deserialized.root.children).toHaveLength(2);
      expect(deserialized.root.children[0].parent).toBe(deserialized.root);
    });

    it('should preserve terminal flag through serialization', () => {
      const deposit = createMockDepositNote(0, '1000000000000000000', { status: 'ragequit' });
      const tree = createNoteTree(deposit);

      const serialized = serializeTree(tree);
      const deserialized = deserializeTree(serialized);

      expect(deserialized.root.isTerminal).toBe(true);
    });
  });

  describe('selectWinnerChain', () => {
    it('should select chain with most recent timestamp as winner', () => {
      // Chain A: older timestamp
      const depositA = createMockDepositNote(0, '1000000000000000000', {
        status: 'spent',
        timestamp: '1700000000',
      });
      const changeA = createMockChangeNote(0, 1, '500000000000000000', {
        status: 'unspent',
        timestamp: '1700000000',
      });

      const treeA = createNoteTree(depositA);
      addChild(treeA.root, changeA);

      // Chain B: more recent timestamp
      const depositB = createMockDepositNote(1, '500000000000000000', {
        status: 'spent',
        timestamp: '1700001000',
      });
      const changeB = createMockChangeNote(1, 1, '300000000000000000', {
        status: 'unspent',
        timestamp: '1700001000',
      });

      const treeB = createNoteTree(depositB);
      addChild(treeB.root, changeB);

      const { winner, loser } = selectWinnerChain(treeA, treeB);

      // B has more recent timestamp, should be winner
      expect(winner.root.note.depositIndex).toBe(1);
      expect(loser.root.note.depositIndex).toBe(0);
    });

    it('should use depositIndex as tiebreaker when timestamps are equal', () => {
      const timestamp = '1700000000';

      // Chain A: depositIndex = 0
      const depositA = createMockDepositNote(0, '1000000000000000000', {
        status: 'spent',
        timestamp,
      });
      const changeA = createMockChangeNote(0, 1, '500000000000000000', {
        status: 'unspent',
        timestamp,
      });

      const treeA = createNoteTree(depositA);
      addChild(treeA.root, changeA);

      // Chain B: depositIndex = 5 (larger)
      const depositB = createMockDepositNote(5, '500000000000000000', {
        status: 'spent',
        timestamp,
      });
      const changeB = createMockChangeNote(5, 1, '300000000000000000', {
        status: 'unspent',
        timestamp,
      });

      const treeB = createNoteTree(depositB);
      addChild(treeB.root, changeB);

      const { winner, loser } = selectWinnerChain(treeA, treeB);

      // B has larger depositIndex, should be winner
      expect(winner.root.note.depositIndex).toBe(5);
      expect(loser.root.note.depositIndex).toBe(0);
    });

    it('should use originChainId as final tiebreaker', () => {
      const timestamp = '1700000000';
      const depositIndex = 0;

      // Chain A: originChainId = "421614" (smaller lexicographically)
      const depositA = createMockDepositNote(depositIndex, '1000000000000000000', {
        status: 'spent',
        timestamp,
        originChainId: '421614',
      });
      const changeA = createMockChangeNote(depositIndex, 1, '500000000000000000', {
        status: 'unspent',
        timestamp,
        originChainId: '421614',
      });

      const treeA = createNoteTree(depositA);
      addChild(treeA.root, changeA);

      // Chain B: originChainId = "84532" (larger lexicographically)
      const depositB = createMockDepositNote(depositIndex, '500000000000000000', {
        status: 'spent',
        timestamp,
        originChainId: '84532',
      });
      const changeB = createMockChangeNote(depositIndex, 1, '300000000000000000', {
        status: 'unspent',
        timestamp,
        originChainId: '84532',
      });

      const treeB = createNoteTree(depositB);
      addChild(treeB.root, changeB);

      const { winner, loser } = selectWinnerChain(treeA, treeB);

      // B has larger originChainId, should be winner
      expect(winner.root.note.originChainId).toBe('84532');
      expect(loser.root.note.originChainId).toBe('421614');
    });

    it('should throw when tree has no spendable leaves', () => {
      const depositA = createMockDepositNote(0, '1000000000000000000', { status: 'spent' });
      const treeA = createNoteTree(depositA);

      const depositB = createMockDepositNote(1, '500000000000000000', { status: 'unspent' });
      const treeB = createNoteTree(depositB);

      expect(() => selectWinnerChain(treeA, treeB)).toThrow(
        'Cannot select winner: one or both trees have no spendable leaves',
      );
    });
  });
});
