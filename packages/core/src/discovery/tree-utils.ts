/**
 * @shinobi-cash/core/discovery
 * Tree utilities for NoteTree operations
 */

import type {
  Note,
  NoteNode,
  NoteTree,
  SerializableNoteNode,
} from './types.js';
import { isTerminalNote } from './types.js';

// ============================================================================
// Construction
// ============================================================================

/**
 * Create a new NoteTree with the given root note.
 * Root note must be a DepositNote or DepositIntentNote.
 */
export function createNoteTree(rootNote: Note): NoteTree {
  const root = createNoteNode(rootNote, null);
  return { root };
}

/**
 * Create a new NoteNode with the given note and parent.
 */
export function createNoteNode(note: Note, parent: NoteNode | null): NoteNode {
  return {
    note,
    parent,
    children: [],
    isTerminal: isTerminalNote(note),
  };
}

/**
 * Add a child node to a parent node.
 * Returns the newly created child node.
 *
 * @throws Error if parent is terminal (ragequit, merged)
 */
export function addChild(
  parent: NoteNode,
  childNote: Note,
  isTerminal: boolean = false,
): NoteNode {
  if (parent.isTerminal) {
    throw new Error(
      `Cannot add child to terminal node (status: ${parent.note.status}, noteType: ${parent.note.noteType})`,
    );
  }

  const child = createNoteNode(childNote, parent);
  child.isTerminal = isTerminal || isTerminalNote(childNote);
  parent.children.push(child);
  return child;
}

// ============================================================================
// Traversal
// ============================================================================

/**
 * Find a node in the tree matching the predicate.
 * Uses depth-first search.
 */
export function findNode(
  tree: NoteTree,
  predicate: (node: NoteNode) => boolean,
): NoteNode | null {
  function dfs(node: NoteNode): NoteNode | null {
    if (predicate(node)) return node;
    for (const child of node.children) {
      const found = dfs(child);
      if (found) return found;
    }
    return null;
  }
  return dfs(tree.root);
}

/**
 * Find a node by depositIndex and changeIndex.
 */
export function findNodeByPosition(
  tree: NoteTree,
  depositIndex: number,
  changeIndex: number,
): NoteNode | null {
  return findNode(
    tree,
    (node) =>
      node.note.depositIndex === depositIndex &&
      node.note.changeIndex === changeIndex,
  );
}

/**
 * Find a node by orderId (for intent notes).
 */
export function findNodeByOrderId(
  tree: NoteTree,
  orderId: string,
): NoteNode | null {
  return findNode(tree, (node) => node.note.orderId === orderId);
}

/**
 * Get all leaf nodes (nodes with no children).
 */
export function getLeafNodes(tree: NoteTree): NoteNode[] {
  const leaves: NoteNode[] = [];

  function dfs(node: NoteNode): void {
    if (node.children.length === 0) {
      leaves.push(node);
    } else {
      for (const child of node.children) {
        dfs(child);
      }
    }
  }

  dfs(tree.root);
  return leaves;
}

/**
 * Get all spendable leaf nodes.
 * A node is spendable if:
 * - It's a leaf (no children)
 * - Status is 'unspent'
 * - Not terminal
 * - Has positive balance
 */
export function getSpendableLeaves(tree: NoteTree): NoteNode[] {
  return getLeafNodes(tree).filter((node) => {
    const note = node.note;
    return (
      note.status === 'unspent' &&
      !node.isTerminal &&
      BigInt(note.amount) > 0n
    );
  });
}

/**
 * Get the last spendable leaf (by timestamp).
 * Used for backward compatibility with getLastNote().
 */
export function getLastSpendableLeaf(tree: NoteTree): NoteNode | null {
  const spendable = getSpendableLeaves(tree);
  if (spendable.length === 0) return null;

  // Sort by timestamp descending, return most recent
  return spendable.sort(
    (a, b) => Number(BigInt(b.note.timestamp) - BigInt(a.note.timestamp)),
  )[0];
}

/**
 * Get total spendable balance across all spendable leaves.
 */
export function getTotalSpendableBalance(tree: NoteTree): bigint {
  return getSpendableLeaves(tree).reduce(
    (sum, node) => sum + BigInt(node.note.amount),
    0n,
  );
}

/**
 * Traverse tree in depth-first order.
 */
export function traverseTree(
  tree: NoteTree,
  callback: (node: NoteNode, depth: number) => void,
): void {
  function dfs(node: NoteNode, depth: number): void {
    callback(node, depth);
    for (const child of node.children) {
      dfs(child, depth + 1);
    }
  }
  dfs(tree.root, 0);
}

// ============================================================================
// Mutation
// ============================================================================

/**
 * Mark a node as terminal (no children allowed).
 */
export function markTerminal(node: NoteNode): void {
  node.isTerminal = true;
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize a NoteTree to a format without circular references.
 */
export function serializeTree(tree: NoteTree): SerializableNoteNode {
  function serializeNode(node: NoteNode): SerializableNoteNode {
    return {
      note: node.note,
      children: node.children.map(serializeNode),
      isTerminal: node.isTerminal,
    };
  }
  return serializeNode(tree.root);
}

/**
 * Deserialize a SerializableNoteNode back to a NoteTree.
 */
export function deserializeTree(serialized: SerializableNoteNode): NoteTree {
  function deserializeNode(
    data: SerializableNoteNode,
    parent: NoteNode | null,
  ): NoteNode {
    const node: NoteNode = {
      note: data.note,
      parent,
      children: [],
      // Recompute isTerminal from note state rather than trusting serialized value
      isTerminal: isTerminalNote(data.note),
    };
    node.children = data.children.map((child) => deserializeNode(child, node));
    return node;
  }

  const root = deserializeNode(serialized, null);
  return { root };
}

// ============================================================================
// Withdraw2 Winner Selection
// ============================================================================

/**
 * Select the winner chain for a Withdraw2 merge.
 *
 * Winner selection criteria (in order):
 * 1. Most recent timestamp wins
 * 2. Tiebreaker: larger depositIndex wins
 * 3. Final tiebreaker: originChainId (lexicographic)
 */
export function selectWinnerChain(
  treeA: NoteTree,
  treeB: NoteTree,
): { winner: NoteTree; loser: NoteTree } {
  const leafA = getLastSpendableLeaf(treeA);
  const leafB = getLastSpendableLeaf(treeB);

  if (!leafA || !leafB) {
    throw new Error('Cannot select winner: one or both trees have no spendable leaves');
  }

  const timestampA = BigInt(leafA.note.timestamp);
  const timestampB = BigInt(leafB.note.timestamp);

  // 1. Most recent timestamp wins
  if (timestampA !== timestampB) {
    return timestampA > timestampB
      ? { winner: treeA, loser: treeB }
      : { winner: treeB, loser: treeA };
  }

  // 2. Tiebreaker: larger depositIndex wins
  if (leafA.note.depositIndex !== leafB.note.depositIndex) {
    return leafA.note.depositIndex > leafB.note.depositIndex
      ? { winner: treeA, loser: treeB }
      : { winner: treeB, loser: treeA };
  }

  // 3. Final tiebreaker: originChainId (lexicographic)
  return leafA.note.originChainId > leafB.note.originChainId
    ? { winner: treeA, loser: treeB }
    : { winner: treeB, loser: treeA };
}
