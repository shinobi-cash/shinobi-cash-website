/**
 * @shinobi-cash/core/discovery
 * Tree utilities for NoteTree operations
 */

import type { Note, NoteNode, NoteTree, SerializableNoteNode, NoteOrIntent } from "./types.js";
import { isNote, isTerminalNote, isSpendableNote, isIntent } from "./types.js";

// ============================================================================
// Construction
// ============================================================================

/**
 * Create a new NoteTree with the given root.
 * Root must be a DepositNote, DepositIntent, or CrosschainDepositNote.
 */
export function createNoteTree(rootItem: NoteOrIntent): NoteTree {
  const root = createNoteNode(rootItem, null);
  return { root };
}

/**
 * Create a new NoteNode with the given note/intent and parent.
 */
export function createNoteNode(item: NoteOrIntent, parent: NoteNode | null): NoteNode {
  return {
    note: item,
    parent,
    children: [],
    isTerminal: isNote(item) && isTerminalNote(item),
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
  childItem: NoteOrIntent,
  terminal: boolean = false
): NoteNode {
  if (parent.isTerminal) {
    const parentNote = parent.note;
    const typeStr = isNote(parentNote) ? parentNote.noteType : parentNote.intentType;
    throw new Error(`Cannot add child to terminal node (type: ${typeStr})`);
  }

  const child = createNoteNode(childItem, parent);
  child.isTerminal = terminal || (isNote(childItem) && isTerminalNote(childItem));
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
export function findNode(tree: NoteTree, predicate: (node: NoteNode) => boolean): NoteNode | null {
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
 *
 * When multiple nodes have the same position (e.g., depositIntent and its
 * crosschainDeposit child both at changeIndex=0), this returns the DEEPEST
 * matching node. This ensures we find the actual spendable note rather than
 * an intent note that has been filled.
 */
export function findNodeByPosition(
  tree: NoteTree,
  depositIndex: number,
  changeIndex: number
): NoteNode | null {
  let deepestMatch: NoteNode | null = null;

  function dfs(node: NoteNode): void {
    if (node.note.depositIndex === depositIndex && node.note.changeIndex === changeIndex) {
      deepestMatch = node;
    }
    for (const child of node.children) {
      dfs(child);
    }
  }

  dfs(tree.root);
  return deepestMatch;
}

/**
 * Find a node by orderId (for intents).
 */
export function findNodeByOrderId(tree: NoteTree, orderId: string): NoteNode | null {
  return findNode(tree, (node) => isIntent(node.note) && node.note.orderId === orderId);
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
 * - Item is a note (not an intent)
 * - Note type is spendable (deposit, crosschainDeposit, change, refund)
 * - Status is 'unspent'
 * - Not terminal
 * - Has positive balance
 */
export function getSpendableLeaves(tree: NoteTree): NoteNode[] {
  return getLeafNodes(tree).filter((node) => {
    const item = node.note;
    return (
      isNote(item) &&
      isSpendableNote(item) &&
      item.status === "unspent" &&
      !node.isTerminal &&
      BigInt(item.amount) > 0n
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
  return spendable.sort((a, b) =>
    Number(BigInt(b.note.originTimestamp) - BigInt(a.note.originTimestamp))
  )[0];
}

/**
 * Get total spendable balance across all spendable leaves.
 */
export function getTotalSpendableBalance(tree: NoteTree): bigint {
  return getSpendableLeaves(tree).reduce((sum, node) => sum + BigInt(node.note.amount), 0n);
}

/**
 * Traverse tree in depth-first order.
 */
export function traverseTree(
  tree: NoteTree,
  callback: (node: NoteNode, depth: number) => void
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
  function deserializeNode(data: SerializableNoteNode, parent: NoteNode | null): NoteNode {
    const item = data.note;
    const node: NoteNode = {
      note: item,
      parent,
      children: [],
      // Recompute isTerminal from note state rather than trusting serialized value
      // Intents are never terminal (they await fill/refund)
      isTerminal: isNote(item) && isTerminalNote(item),
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
  treeB: NoteTree
): { winner: NoteTree; loser: NoteTree } {
  const leafA = getLastSpendableLeaf(treeA);
  const leafB = getLastSpendableLeaf(treeB);

  if (!leafA || !leafB) {
    throw new Error("Cannot select winner: one or both trees have no spendable leaves");
  }

  const timestampA = BigInt(leafA.note.originTimestamp);
  const timestampB = BigInt(leafB.note.originTimestamp);

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
