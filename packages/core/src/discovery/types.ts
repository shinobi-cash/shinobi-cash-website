/**
 * @shinobi-cash/core/discovery
 * Type definitions for Note Discovery v2
 */

import type { ASPStatus, IntentStatus } from '@shinobi-cash/data';

// ============================================================================
// Note Status
// ============================================================================

export type NoteStatus = 'unspent' | 'spent' | 'merged';

// ============================================================================
// Activity Metadata
// ============================================================================

export interface ActivityMetadata {
  originalAmount?: string;
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
  destinationTransactionHash: string;
  originChainId: string;
  destinationChainId: string;
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
  /** For Withdraw2 change notes: which chain was merged into this one */
  mergedFromDepositIndex?: number;
}

/** Refund note - created from failed cross-chain withdrawals */
export interface RefundNote extends BaseNote {
  noteType: 'refund';
  changeIndex: number;
  refundIndex: number;
  refundCommitment: string;
}

/**
 * Pending intent note - represents escrowed funds awaiting solver fill or refund.
 * Created when a cross-chain withdrawal is initiated, sibling of the ChangeNote.
 *
 * Has both `changeIndex` and `parentChangeIndex` which are equal - the changeIndex
 * of the spent note. This is for compatibility with code that accesses changeIndex
 * on the Note union type, while parentChangeIndex makes the derivation path explicit.
 */
export interface PendingIntentNote {
  noteType: 'pendingIntent';
  // Identity
  poolAddress: string;
  depositIndex: number;
  /** For compatibility with Note union - equals parentChangeIndex */
  changeIndex: number;
  /** The changeIndex of the spent note (for derivation path) - same as changeIndex */
  parentChangeIndex: number;
  // Value
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
  // Cross-chain (always true for PendingIntentNote)
  isCrossChain: true;
  orderId: string;
  intentStatus: IntentStatus;
  fillDeadline?: string;
  expires?: string;
  // PendingIntent-specific
  refundCommitment: string;
  // ASP
  aspStatus: ASPStatus;
  // Activity data
  activityData: ActivityMetadata;
  // Discovery tracking
  discoveredAtOffset?: number;
}

export type Note = DepositNote | ChangeNote | RefundNote | PendingIntentNote;
export type NoteChain = Note[];

// ============================================================================
// Nullifier Tracking
// ============================================================================

/** Maps a nullifier hash to its note location */
export interface NullifierInfo {
  depositIndex: number;
  changeIndex: number;
}

// ============================================================================
// Discovery State
// ============================================================================

export interface DiscoveryState {
  /** All discovered note chains, keyed by depositIndex */
  chains: Map<number, NoteChain>;
  /** Nullifier hash -> note location for quick lookups */
  nullifierMap: Map<string, NullifierInfo>;
  /** Next deposit index to scan */
  nextDepositIndex: number;
  /** Minimum offset to fetch from (earliest unspent note's discovery offset) */
  minOffset: number;
  /** Count of new deposits found in this sync */
  newDepositsFound: number;
}

/** Serializable version of DiscoveryState for persistence */
export interface SerializableDiscoveryState {
  chains: Array<{ depositIndex: number; chain: NoteChain }>;
  nullifierMap: Array<{ hash: string; info: NullifierInfo }>;
  nextDepositIndex: number;
  minOffset: number;
  newDepositsFound: number;
}

// ============================================================================
// Discovery Results
// ============================================================================

export interface DiscoveryResult {
  notes: NoteChain[];
  lastUsedIndex: number;
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
