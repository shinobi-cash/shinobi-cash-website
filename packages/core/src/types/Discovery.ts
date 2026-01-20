/**
 * Note Discovery Type Definitions
 *
 * Types for the note discovery process that scans indexed blockchain data
 * to find notes belonging to a user's account.
 */

import type { NoteChain } from './Note.js';

/**
 * Live deposit being tracked for chain extension
 *
 * References the actual chain object instead of array index for safety.
 */
export interface LiveDeposit {
  /** Deposit index being tracked */
  depositIndex: number;

  /** The actual note chain (direct reference, not index) */
  chain: NoteChain;

  /** Remaining amount in the live deposit */
  remaining: bigint;
}

/**
 * Discovery state for resumable, stateful sync
 *
 * Represents the complete state of note discovery at any point in time.
 * Pure state transitions enable:
 * - Time-travel debugging
 * - Easy testing
 * - Background worker migration
 * - Clear invariants
 */
export interface DiscoveryState {
  /** All discovered note chains */
  notes: NoteChain[];

  /** Next deposit index to scan */
  nextDepositIndex: number;

  /** Live deposits being tracked for extension */
  liveDeposits: LiveDeposit[];

  /** Pagination offset for resume */
  offset?: number;

  /** Number of new deposits found in this session */
  newDepositsFound: number;
}

/**
 * Result of a note discovery operation
 */
export interface DiscoveryResult {
  /** Discovered note chains */
  notes: NoteChain[];

  /** Last used deposit index (for generating next deposit) */
  lastUsedIndex: number;

  /** Number of new notes found in this discovery session */
  newNotesFound: number;

  /** Pagination offset for resuming discovery */
  lastProcessedOffset?: number;
}

/**
 * Progress information during note discovery
 * Used for UI feedback during potentially long-running scans
 */
export interface DiscoveryProgress {
  /** Number of activity pages processed */
  pagesProcessed: number;

  /** Number of activities in the current page */
  currentPageActivityCount: number;

  /** Number of deposit indices checked */
  depositsChecked: number;

  /** Number of deposits matched to this account */
  depositsMatched: number;

  /** Last pagination offset processed */
  lastOffset?: number;

  /** Whether the discovery scan is complete */
  complete: boolean;
}

/**
 * Policy configuration for note discovery behavior
 *
 * Tunable parameters that control discovery performance and resource usage.
 * Extracted from magic numbers to enable testing and per-environment tuning.
 */
export interface DiscoveryPolicy {
  /** Maximum number of deposit indices to check per page (default: 100) */
  maxDepositScan: number;

  /** Number of activities to fetch per page (default: 100) */
  pageSize: number;

  /** How often to persist state (every N pages, default: 1) */
  persistEveryPages: number;
}

/**
 * Default discovery policy for production use
 */
export const DEFAULT_DISCOVERY_POLICY: DiscoveryPolicy = {
  maxDepositScan: 100,
  pageSize: 100,
  persistEveryPages: 1,
};

/**
 * Options for note discovery
 */
export interface DiscoveryOptions {
  /** Abort signal for canceling long-running discovery */
  signal?: AbortSignal;

  /** Progress callback for UI updates */
  onProgress?: (progress: DiscoveryProgress) => void;

  /** Maximum number of pages to scan (default: unlimited) */
  maxPages?: number;

  /** Page size for activity queries (default: 100) */
  pageSize?: number;

  /** Discovery policy (default: DEFAULT_DISCOVERY_POLICY) */
  policy?: DiscoveryPolicy;
}
