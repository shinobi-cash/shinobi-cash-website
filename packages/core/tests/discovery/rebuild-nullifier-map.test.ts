/**
 * Tests for rebuildNullifierMap functionality
 *
 * Verifies that nullifiers can be rebuilt from trees when the nullifierMap
 * is empty (migration for old cached data).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { rebuildNullifierMap } from '../../src/discovery/index.js';
import { extendAllTrees } from '../../src/discovery/chain-extender.js';
import { buildActivityIndex } from '../../src/discovery/activity-indexer.js';
import { deriveAndHashNullifier } from '../../src/discovery/nullifier-utils.js';
import type { DiscoveryState, NoteTree, NullifierInfo, ChainKey, ChangeNote } from '../../src/discovery/types.js';
import { makeChainKey } from '../../src/discovery/types.js';
import {
  createMockNoteTree,
  createMockTreeWithWithdrawal,
  createMockWithdraw2Activity,
  createTestNoteDeriver,
  resetActivityCounter,
  TEST_POOL_ADDRESS,
  TEST_ACCOUNT_KEY,
  TEST_CHAIN_ID,
  toEther,
} from './fixtures.js';

const TEST_CRYPTO = createTestNoteDeriver();

describe('rebuildNullifierMap', () => {
  beforeEach(() => {
    resetActivityCounter();
  });

  function createEmptyState(): DiscoveryState {
    return {
      trees: new Map(),
      nullifierMap: new Map(),
      nextDepositIndex: new Map(),
      activities: new Map(),
      minOffset: 0,
      newFilledDepositsFound: 0,
      newPendingDepositsFound: 0,
    };
  }

  describe('basic rebuilding', () => {
    it('should rebuild nullifier for a single deposit tree', () => {
      const state = createEmptyState();
      const tree = createMockNoteTree(0, toEther(1));
      const chainKey = makeChainKey(TEST_CHAIN_ID, 0);
      state.trees.set(chainKey, tree);

      // Initially no nullifiers
      expect(state.nullifierMap.size).toBe(0);

      // Rebuild
      rebuildNullifierMap(state, TEST_CRYPTO, TEST_POOL_ADDRESS);

      // Should have one nullifier
      expect(state.nullifierMap.size).toBe(1);

      // Verify the nullifier is correct
      const expectedNullifier = deriveAndHashNullifier(
        TEST_ACCOUNT_KEY,
        TEST_POOL_ADDRESS,
        TEST_CHAIN_ID,
        0, // depositIndex
        0, // changeIndex
      );
      expect(state.nullifierMap.has(expectedNullifier)).toBe(true);
      expect(state.nullifierMap.get(expectedNullifier)).toEqual({
        originChainId: TEST_CHAIN_ID,
        depositIndex: 0,
        changeIndex: 0,
      });
    });

    it('should rebuild nullifiers for multiple trees', () => {
      const state = createEmptyState();

      // Add two trees
      const tree0 = createMockNoteTree(0, toEther(1));
      const tree1 = createMockNoteTree(1, toEther(2));
      state.trees.set(makeChainKey(TEST_CHAIN_ID, 0), tree0);
      state.trees.set(makeChainKey(TEST_CHAIN_ID, 1), tree1);

      rebuildNullifierMap(state, TEST_CRYPTO, TEST_POOL_ADDRESS);

      // Should have two nullifiers
      expect(state.nullifierMap.size).toBe(2);

      // Verify both nullifiers
      const nullifier0 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 0);
      const nullifier1 = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 1, 0);
      expect(state.nullifierMap.has(nullifier0)).toBe(true);
      expect(state.nullifierMap.has(nullifier1)).toBe(true);
    });

    it('should rebuild nullifier for change note after withdrawal', () => {
      const state = createEmptyState();

      // Tree with one withdrawal: deposit(1 ETH) -> change(0.5 ETH)
      const tree = createMockTreeWithWithdrawal(0, toEther(1), toEther(0.5));
      state.trees.set(makeChainKey(TEST_CHAIN_ID, 0), tree);

      rebuildNullifierMap(state, TEST_CRYPTO, TEST_POOL_ADDRESS);

      // Should have one nullifier for the change note (the spent deposit has no nullifier)
      expect(state.nullifierMap.size).toBe(1);

      // Verify it's for changeIndex 1 (not 0)
      const changeNullifier = deriveAndHashNullifier(TEST_ACCOUNT_KEY, TEST_POOL_ADDRESS, TEST_CHAIN_ID, 0, 1);
      expect(state.nullifierMap.has(changeNullifier)).toBe(true);
      expect(state.nullifierMap.get(changeNullifier)).toEqual({
        originChainId: TEST_CHAIN_ID,
        depositIndex: 0,
        changeIndex: 1,
      });
    });

    it('should do nothing when trees is empty', () => {
      const state = createEmptyState();

      rebuildNullifierMap(state, TEST_CRYPTO, TEST_POOL_ADDRESS);

      expect(state.nullifierMap.size).toBe(0);
    });

    it('should not add duplicates when called multiple times', () => {
      const state = createEmptyState();
      const tree = createMockNoteTree(0, toEther(1));
      state.trees.set(makeChainKey(TEST_CHAIN_ID, 0), tree);

      rebuildNullifierMap(state, TEST_CRYPTO, TEST_POOL_ADDRESS);
      rebuildNullifierMap(state, TEST_CRYPTO, TEST_POOL_ADDRESS);

      // Map naturally deduplicates
      expect(state.nullifierMap.size).toBe(1);
    });
  });

  describe('Withdraw2 after rebuild', () => {
    it('should enable Withdraw2 to work after nullifierMap is rebuilt', () => {
      // Setup: Two trees with empty nullifierMap (simulating old cached data)
      const state = createEmptyState();
      const tree0 = createMockNoteTree(0, toEther(1));
      const tree1 = createMockNoteTree(1, toEther(2));
      const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
      const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
      state.trees.set(chainKey0, tree0);
      state.trees.set(chainKey1, tree1);

      // Rebuild nullifiers (this is what the fix does)
      rebuildNullifierMap(state, TEST_CRYPTO, TEST_POOL_ADDRESS);

      // Now create a Withdraw2 activity that merges both notes
      const withdraw2Activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const activityIndex = buildActivityIndex([withdraw2Activity]);

      // Apply extensions - this should now work because nullifiers are rebuilt
      const result = extendAllTrees(
        state.trees,
        state.nullifierMap,
        activityIndex,
        TEST_CRYPTO,
        TEST_POOL_ADDRESS,
      );

      // Primary tree (depositIndex 1) should have change note + withdrawal note
      const primaryTree = result.updatedTrees.get(chainKey1)!;
      expect(primaryTree.root.note.status).toBe('spent');
      expect(primaryTree.root.children).toHaveLength(2);

      const changeNode = primaryTree.root.children.find((c) => c.note.noteType === 'change');
      expect(changeNode).toBeDefined();
      expect((changeNode!.note as ChangeNote).amount).toBe(toEther(2.5).toString()); // 1 + 2 - 0.5

      // Secondary tree (depositIndex 0) should have merged note
      const secondaryTree = result.updatedTrees.get(chainKey0)!;
      expect(secondaryTree.root.note.status).toBe('spent');
      expect(secondaryTree.root.children).toHaveLength(1);
      expect(secondaryTree.root.children[0].note.noteType).toBe('merged');
      expect(secondaryTree.root.children[0].isTerminal).toBe(true);
    });

    it('should fail Withdraw2 without rebuild (empty nullifierMap)', () => {
      // Setup: Two trees with empty nullifierMap
      const trees = new Map<ChainKey, NoteTree>();
      const tree0 = createMockNoteTree(0, toEther(1));
      const tree1 = createMockNoteTree(1, toEther(2));
      const chainKey0 = makeChainKey(TEST_CHAIN_ID, 0);
      const chainKey1 = makeChainKey(TEST_CHAIN_ID, 1);
      trees.set(chainKey0, tree0);
      trees.set(chainKey1, tree1);

      // Empty nullifierMap (no rebuild)
      const emptyNullifierMap = new Map<string, NullifierInfo>();

      // Create Withdraw2 activity
      const withdraw2Activity = createMockWithdraw2Activity(0, 0, 1, 0, toEther(0.5));
      const activityIndex = buildActivityIndex([withdraw2Activity]);

      // Apply extensions - this should NOT work because nullifierMap is empty
      const result = extendAllTrees(
        trees,
        emptyNullifierMap,
        activityIndex,
        TEST_CRYPTO,
        TEST_POOL_ADDRESS,
      );

      // Trees should be unchanged (no extension applied)
      const tree0After = result.updatedTrees.get(chainKey0)!;
      const tree1After = result.updatedTrees.get(chainKey1)!;

      expect(tree0After.root.children).toHaveLength(0);
      expect(tree1After.root.children).toHaveLength(0);
      expect(tree0After.root.note.status).toBe('unspent');
      expect(tree1After.root.note.status).toBe('unspent');
    });
  });
});
