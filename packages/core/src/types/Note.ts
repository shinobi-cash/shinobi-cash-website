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
 */

import type { ASPStatus } from '@shinobi-cash/data';
import type { PrecommitmentHash } from './Hash.js';

/**
 * Common fields shared by all note types
 */
interface BaseNote {
  /** Pool contract address */
  poolAddress: string;

  /** Sequential deposit index for this account in this pool */
  depositIndex: number;

  /** Note amount in wei (as string for BigInt compatibility) */
  amount: string;

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

  /** Spending status of the note */
  status: 'unspent' | 'spent';

  /** ASP (Approved Set of Participants) approval status */
  aspStatus: ASPStatus;

  /** Whether the note has been activated in the pool (labeled by solver) */
  isActivated: boolean;

  /** Label assigned by solver (keccak256 hash) */
  label: string;
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
