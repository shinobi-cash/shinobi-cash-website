/**
 * @shinobi-cash/core/discovery
 * Type definitions for Note Discovery v2
 */

import type { ASPStatus, IntentStatus } from '@shinobi-cash/data';

// ============================================================================
// Note Status
// ============================================================================

export type NoteStatus = 'unspent' | 'spent' | 'merged' | 'ragequit';

// ============================================================================
// Activity Metadata
// ============================================================================

export interface ActivityMetadata {
  originalAmount?: string;
  /** The actual withdrawn amount from activity.amount (for withdrawals) */
  withdrawnAmount?: string;
  vettingFeeAmount?: string;
  relayFeeAmount?: string;
  solverFeeAmount?: string;
  paymasterFeeRefund?: string;
  user?: string;
  recipient?: string;
  relayer?: string;
  solver?: string;
  vettingFeeRecipient?: string;
  commitment?: string;
  spentNullifier?: string;
  /** Second nullifier for Withdraw2 (2:1 JoinSplit) */
  spentNullifier1?: string;
  newCommitment?: string;
  isSponsored?: boolean;
  /** Ragequit (public withdrawal) metadata */
  ragequitTxHash?: string;
  ragequitTimestamp?: string;
  ragequitBlockNumber?: string;
  ragequitUser?: string;
  ragequitAmount?: string;
}

// ============================================================================
// Note Types
// ============================================================================

interface BaseNote {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  amount: string;
  label?: string; // undefined for unfilled cross-chain deposit intents
  status: NoteStatus;
  // Blockchain metadata
  blockNumber: string;
  timestamp: string;
  originTransactionHash: string;
  /** Only set for cross-chain operations (different from originTransactionHash) */
  destinationTransactionHash?: string;
  originChainId: string;
  /** Only set for cross-chain operations (different from originChainId) */
  destinationChainId?: string;
  // Cross-chain
  isCrossChain: boolean;
  orderId?: string;
  intentStatus?: IntentStatus;
  fillDeadline?: string;
  expires?: string;
  // ASP
  aspStatus: ASPStatus;
  // Merge tracking (for 'merged' status)
  mergedIntoDepositIndex?: number;
  // Activity data
  activityData: ActivityMetadata;
  // Discovery tracking - offset at which deposit was discovered
  discoveredAtOffset?: number;
}

/** Deposit note - the first note in a chain (changeIndex = 0) */
export interface DepositNote extends BaseNote {
  noteType: 'deposit';
  changeIndex: 0;
  precommitmentHash: string;
}

/** Change note - created from withdrawals (changeIndex > 0) */
export interface ChangeNote extends BaseNote {
  noteType: 'change';
  changeIndex: number;
  refundCommitment?: string;
  /** For Withdraw2 winner: depositIndex of the note that was merged into this one */
  mergedFromDepositIndex?: number;
  /** For Withdraw2 winner: originChainId of the note that was merged into this one */
  mergedFromOriginChainId?: string;
  /** For Withdraw2 winner: amount contributed from the merged note */
  mergedFromAmount?: string;
  /** For Withdraw2 secondary (merged note): originChainId of the winner note it merged into */
  mergedIntoOriginChainId?: string;
}

/** Refund note - created from failed cross-chain withdrawals */
export interface RefundNote extends BaseNote {
  noteType: 'refund';
  changeIndex: number;
  refundIndex: number;
  refundCommitment: string;
}

// ============================================================================
// Intent Note Types (Split from PendingIntentNote)
// ============================================================================

/**
 * Base interface for intent notes (shared fields between deposit and withdrawal intents)
 */
interface BaseIntentNote {
  poolAddress: string;
  depositIndex: number;
  amount: string;
  label?: string;
  status: NoteStatus;
  // Blockchain metadata
  blockNumber: string;
  timestamp: string;
  originTransactionHash: string;
  destinationTransactionHash: string;
  originChainId: string;
  destinationChainId: string;
  // Cross-chain (always true for intent notes)
  isCrossChain: true;
  orderId: string;
  intentStatus: IntentStatus;
  fillDeadline?: string;
  expires?: string;
  // ASP
  aspStatus: ASPStatus;
  // Activity data
  activityData: ActivityMetadata;
  // Discovery tracking
  discoveredAtOffset?: number;
}

/**
 * Deposit intent note - pending cross-chain deposit awaiting solver fill.
 * First note in a chain, represents funds escrowed on ORIGIN chain.
 *
 * Lifecycle:
 * - Created when CROSSCHAIN_DEPOSIT_PENDING activity is discovered
 * - Filled: Reconciler creates DepositNote, this note marked spent
 * - Refunded: Funds return to user's wallet on origin chain (no RefundNote needed)
 */
export interface DepositIntentNote extends BaseIntentNote {
  noteType: 'depositIntent';
  /** Always 0 - first note in chain */
  changeIndex: 0;
  /** Refund commitment for deposit intents (optional - may not be set) */
  refundCommitment?: string;
}

/**
 * Withdrawal intent note - pending cross-chain withdrawal awaiting solver delivery.
 * Sibling of ChangeNote, represents funds escrowed on POOL chain.
 *
 * Lifecycle:
 * - Created when cross-chain withdrawal is initiated
 * - Filled: Solver delivers funds to recipient, this note marked spent
 * - Refunded: RefundNote created (spendable in pool)
 */
export interface WithdrawalIntentNote extends BaseIntentNote {
  noteType: 'withdrawalIntent';
  /** For compatibility with Note union - equals parentChangeIndex */
  changeIndex: number;
  /** The changeIndex of the spent note (for derivation path) */
  parentChangeIndex: number;
  /** Refund commitment for claiming refund if intent expires (required) */
  refundCommitment: string;
}

export type Note = DepositNote | ChangeNote | RefundNote | DepositIntentNote | WithdrawalIntentNote;

// ============================================================================
// Note Tree Structure
// ============================================================================

/**
 * Tree node wrapper for notes with parent/child relationships.
 *
 * Note Relationships:
 * - DepositNote → ChangeNote (state transition: withdrawal)
 * - DepositIntentNote → DepositNote (state transition: fill)
 * - ChangeNote → ChangeNote (state transition: subsequent withdrawal)
 * - Spent note → [ChangeNote, WithdrawalIntentNote] (siblings: branching)
 * - WithdrawalIntentNote → RefundNote (state transition: refund)
 * - RefundNote → ChangeNote (state transition: spend refund)
 */
export interface NoteNode {
  /** The note data */
  note: Note;

  /** Parent node reference (null for root/DepositNote/DepositIntentNote) */
  parent: NoteNode | null;

  /** Child nodes (can have multiple for sibling branches) */
  children: NoteNode[];

  /**
   * Terminal flag - no children allowed.
   * Set for: ragequit, merged, filled WithdrawalIntentNote, refunded DepositIntentNote
   */
  isTerminal: boolean;
}

/**
 * A note tree rooted at a DepositNote or DepositIntentNote.
 * Represents all notes derived from a single deposit.
 */
export interface NoteTree {
  /** Root node (always DepositNote or DepositIntentNote) */
  root: NoteNode;
}

/**
 * Serializable format for tree persistence (no circular references).
 */
export interface SerializableNoteNode {
  note: Note;
  children: SerializableNoteNode[];
  isTerminal: boolean;
}


// ============================================================================
// Type Guards
// ============================================================================

/** Check if a note is a DepositIntentNote */
export function isDepositIntentNote(note: Note): note is DepositIntentNote {
  return note.noteType === 'depositIntent';
}

/** Check if a note is a WithdrawalIntentNote */
export function isWithdrawalIntentNote(note: Note): note is WithdrawalIntentNote {
  return note.noteType === 'withdrawalIntent';
}

/** Check if a note is a RefundNote */
export function isRefundNote(note: Note): note is RefundNote {
  return note.noteType === 'refund';
}

/** Check if a note is a DepositNote */
export function isDepositNote(note: Note): note is DepositNote {
  return note.noteType === 'deposit';
}

/** Check if a note is a ChangeNote */
export function isChangeNote(note: Note): note is ChangeNote {
  return note.noteType === 'change';
}

/**
 * Check if a note is terminal (no children allowed).
 * Terminal states:
 * - ragequit: public withdrawal, funds withdrawn
 * - merged: secondary chain in Withdraw2
 * - filled WithdrawalIntentNote: funds delivered to recipient
 * - refunded DepositIntentNote: funds returned to origin chain
 */
export function isTerminalNote(note: Note): boolean {
  if (note.status === 'ragequit' || note.status === 'merged') {
    return true;
  }
  if (note.noteType === 'withdrawalIntent' && note.intentStatus === 'filled') {
    return true;
  }
  if (note.noteType === 'depositIntent' && note.intentStatus === 'refunded') {
    return true;
  }
  return false;
}

/** Check if a note is any intent note (deposit or withdrawal) */
export function isIntentNote(note: Note): note is DepositIntentNote | WithdrawalIntentNote {
  return note.noteType === 'depositIntent' || note.noteType === 'withdrawalIntent';
}

// ============================================================================
// Nullifier Tracking
// ============================================================================

/** Maps a nullifier hash to its note location */
export interface NullifierInfo {
  originChainId: string;
  depositIndex: number;
  changeIndex: number;
}

// ============================================================================
// Discovery State
// ============================================================================

/**
 * Composite key for chain lookup: `${originChainId}:${depositIndex}`
 * Required because depositIndex is now per-origin-chain, not globally unique.
 */
export type ChainKey = string;

/** Create a chain key from originChainId and depositIndex */
export function makeChainKey(originChainId: string | number | bigint, depositIndex: number): ChainKey {
  return `${originChainId}:${depositIndex}`;
}

/** Parse a chain key back to its components */
export function parseChainKey(key: ChainKey): { originChainId: string; depositIndex: number } {
  const [originChainId, depositIndexStr] = key.split(':');
  return { originChainId, depositIndex: parseInt(depositIndexStr, 10) };
}

export interface DiscoveryState {
  /** All discovered note trees, keyed by ChainKey (originChainId:depositIndex) */
  trees: Map<ChainKey, NoteTree>;
  /** Nullifier hash -> note location for quick lookups */
  nullifierMap: Map<string, NullifierInfo>;
  /** Next deposit index to scan per chain (keyed by chainId string) */
  nextDepositIndex: Map<string, number>;
  /** Minimum offset to fetch from (earliest unspent note's discovery offset) */
  minOffset: number;
  /** Count of new filled deposits found in this sync (spendable) */
  newFilledDepositsFound: number;
  /** Count of new pending deposits found in this sync (awaiting fill) */
  newPendingDepositsFound: number;
}

/** Serializable version of DiscoveryState for persistence */
export interface SerializableDiscoveryState {
  /** Trees keyed by ChainKey (originChainId:depositIndex) */
  trees: Array<{ chainKey: ChainKey; tree: SerializableNoteNode }>;
  nullifierMap: Array<{ hash: string; info: NullifierInfo }>;
  /** Next deposit index per chain (keyed by chainId string) */
  nextDepositIndex: Array<{ chainId: string; index: number }>;
  minOffset: number;
  newFilledDepositsFound: number;
  newPendingDepositsFound: number;
}

// ============================================================================
// Discovery Results
// ============================================================================

export interface DiscoveryResult {
  /** All discovered note trees */
  trees: NoteTree[];
  /** Last used deposit index per chain (keyed by chainId string) */
  lastUsedIndexByChain: Map<string, number>;
  newNotesFound: number;
  minOffset: number;
}

export interface DiscoveryProgress {
  pagesProcessed: number;
  currentPageActivityCount: number;
  depositsChecked: number;
  depositsMatched: number;
  complete: boolean;
}

// ============================================================================
// Discovery Configuration
// ============================================================================

export interface DiscoveryPolicy {
  /** Maximum deposit indices to scan per page */
  maxDepositScan: number;
  /** Activities per page fetch */
  pageSize: number;
  /** Persist state every N pages */
  persistEveryPages: number;
}

export const DEFAULT_DISCOVERY_POLICY: DiscoveryPolicy = {
  maxDepositScan: 100,
  pageSize: 100,
  persistEveryPages: 1,
};

export interface DiscoveryOptions {
  signal?: AbortSignal;
  onProgress?: (progress: DiscoveryProgress) => void;
  maxPages?: number;
  pageSize?: number;
  policy?: DiscoveryPolicy;
}

// ============================================================================
// I/O Interfaces
// ============================================================================

export interface ActivityPage {
  items: import('@shinobi-cash/data').Activity[];
  pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
}

export type ActivityFetcher = (
  poolAddress: string,
  limit: number,
  offset?: number,
  orderDirection?: 'asc' | 'desc',
) => Promise<ActivityPage>;

export interface PersistenceCallbacks {
  loadState: (publicKey: string, poolAddress: string) => Promise<SerializableDiscoveryState | null>;
  saveState: (publicKey: string, poolAddress: string, state: SerializableDiscoveryState) => Promise<void>;
}
