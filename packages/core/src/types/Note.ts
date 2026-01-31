/**
 * Note Type Definitions
 *
 * Notes represent privacy pool commitments that can be deposited, withdrawn, or changed.
 * Each note contains cryptographic commitments and metadata for ZK proof generation.
 *
 * Uses discriminated unions to enforce invariants at the type level:
 * - Deposit notes always have changeIndex === 0 and precommitmentHash
 * - Change notes always have changeIndex > 0 and no precommitmentHash
 * - Refund notes track failed cross-chain withdrawals
 *
 * Activity-related metadata (fees, actors, crypto hashes) is nested under `activityData`
 * to separate core note identity from transaction context.
 */

import type { ASPStatus, IntentStatus } from '@shinobi-cash/data';
import type { PrecommitmentHash } from './Hash.js';

/**
 * Activity data from the transaction that created or spent this note.
 *
 * For deposit notes: Contains deposit transaction metadata
 * For change notes: Contains withdrawal transaction metadata
 * For refund notes: Contains refund transaction metadata
 *
 * This data is populated from the indexer Activity and represents
 * transaction context rather than intrinsic note properties.
 */
export interface NoteActivityData {
  // ========================================
  // Fee Breakdown
  // ========================================

  /** Original amount before any fees (wei as string) */
  originalAmount?: string;

  /** Vetting/compliance fee paid to ASP (wei as string) */
  vettingFeeAmount?: string;

  /** Relay fee for gas sponsorship (wei as string) */
  relayFeeAmount?: string;

  /** Solver fee for cross-chain operations (wei as string) */
  solverFeeAmount?: string;

  /** Paymaster fee refund (wei as string) */
  paymasterFeeRefund?: string;

  // ========================================
  // Transaction Actors
  // ========================================

  /** User/depositor address */
  user?: string;

  /** Withdrawal recipient address */
  recipient?: string;

  /** Relayer/gas sponsor address */
  relayer?: string;

  /** Cross-chain solver address */
  solver?: string;

  /** Vetting fee recipient (typically Entrypoint) */
  vettingFeeRecipient?: string;

  // ========================================
  // Cryptographic Hashes
  // ========================================

  /** Note commitment hash */
  commitment?: string;

  /** Nullifier used to spend the note (withdrawals only) */
  spentNullifier?: string;

  /** New commitment created (change note commitment) */
  newCommitment?: string;

  // ========================================
  // Transaction Metadata
  // ========================================

  /** Whether transaction was sponsored via Account Abstraction */
  isSponsored?: boolean;
}

/**
 * Common fields shared by all note types
 */
interface BaseNote {
  // ========================================
  // Note Identity
  // ========================================

  /** Pool contract address */
  poolAddress: string;

  /** Sequential deposit index for this account in this pool */
  depositIndex: number;

  // ========================================
  // Note Value
  // ========================================

  /** Note amount in wei (current balance, as string for BigInt compatibility) */
  amount: string;

  // ========================================
  // Note Location (Transaction Context)
  // ========================================

  /** Transaction hash on the origin chain */
  originTransactionHash: string;

  /** Transaction hash on the destination chain (same as origin for same-chain) */
  destinationTransactionHash: string;

  /** Chain ID where the note originated */
  originChainId: string;

  /** Chain ID where the note is/will be settled */
  destinationChainId: string;

  /** Block number where note was created */
  blockNumber: string;

  /** Timestamp of note creation */
  timestamp: string;

  // ========================================
  // Note State
  // ========================================

  /** Spending status of the note */
  status: 'unspent' | 'spent';

  /** ASP (Approved Set of Participants) approval status */
  aspStatus: ASPStatus;

  /** Label assigned by solver (keccak256 hash) */
  label: string;

  // ========================================
  // Cross-Chain Context
  // ========================================

  /** Whether this note came from a cross-chain deposit */
  isCrossChain: boolean;

  /** Cross-chain order ID for intent tracking (only for cross-chain deposits) */
  orderId?: string;

  /** Intent status for cross-chain operations (undefined for same-chain) */
  intentStatus?: IntentStatus;

  /** Fill deadline for cross-chain intents - solver must fill before this (unix timestamp as string) */
  fillDeadline?: string;

  /** Expiry timestamp for cross-chain intents - refund available after this (unix timestamp as string) */
  expires?: string;

  // ========================================
  // Activity Data (Transaction Metadata)
  // ========================================

  /**
   * Activity data from the creating transaction.
   * Contains fees, actors, crypto hashes, and metadata.
   */
  activityData: NoteActivityData;
}

/**
 * Deposit note - the first note in a chain
 *
 * Invariants enforced by type system:
 * - changeIndex is always 0
 * - precommitmentHash is always present (required for O(1) lookups)
 * - noteType is always 'deposit'
 */
export interface DepositNote extends BaseNote {
  noteType: 'deposit';
  changeIndex: 0;
  refundIndex?: never;
  refundCommitment?: never;

  /**
   * Precommitment hash from indexer (required for deposits)
   *
   * Indexer-provided hash for O(1) aspStatus updates during sync.
   * Required field for all deposit notes to avoid re-deriving crypto.
   *
   * Always in decimal string format (not 0x-prefixed hex).
   */
  precommitmentHash: PrecommitmentHash;
}

/**
 * Change note - created from withdrawals
 *
 * Invariants enforced by type system:
 * - changeIndex is always > 0
 * - precommitmentHash is never present
 * - noteType is always 'change'
 */
export interface ChangeNote extends BaseNote {
  noteType: 'change';
  changeIndex: number;
  refundIndex?: never;
  precommitmentHash?: never;

  /** Refund commitment for cross-chain failures */
  refundCommitment?: string;
}

/**
 * Refund note - created from failed cross-chain withdrawals
 *
 * Invariants enforced by type system:
 * - Has refundIndex
 * - noteType is always 'refund'
 */
export interface RefundNote extends BaseNote {
  noteType: 'refund';
  changeIndex: number;
  refundIndex: number;
  precommitmentHash?: never;

  /** Refund commitment for the failed withdrawal */
  refundCommitment: string;
}

/**
 * A note representing a commitment in the privacy pool
 *
 * Discriminated union that prevents invalid states at compile time.
 */
export type Note = DepositNote | ChangeNote | RefundNote;

/**
 * A chain of notes representing the complete history of a deposit
 * Starting with an initial deposit, followed by change notes from withdrawals
 */
export type NoteChain = Note[];

/**
 * Cached note data stored locally with discovery metadata
 */
export interface CachedNoteData {
  /** Pool contract address */
  poolAddress: string;

  /** User's public key/address */
  publicKey: string;

  /** All discovered note chains for this account */
  notes: NoteChain[];

  /** Last used deposit index (for generating new deposits) */
  lastUsedDepositIndex: number;

  /** Timestamp of last sync/discovery */
  lastSyncTime: number;

  /** Offset for resumable discovery pagination */
  lastProcessedOffset?: number;
}

/**
 * Type guards for discriminated Note union
 */
export function isDepositNote(note: Note): note is DepositNote {
  return note.noteType === 'deposit';
}

export function isChangeNote(note: Note): note is ChangeNote {
  return note.noteType === 'change';
}

export function isRefundNote(note: Note): note is RefundNote {
  return note.noteType === 'refund';
}
