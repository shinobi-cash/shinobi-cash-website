/**
 * @shinobi-cash/core/discovery
 * Type definitions for Note Discovery v2
 */

import type { ASPStatus, ActivityItem } from "@shinobi-cash/data";

// ============================================================================
// Note Status
// ============================================================================

export type NoteStatus = "unspent" | "spent";

// ============================================================================
// Serial Number
// ============================================================================

/**
 * Chain ID to 3-letter code mapping for serial numbers.
 */
export const CHAIN_CODES: Record<string, string> = {
  // Testnets
  "421614": "ARB", // Arbitrum Sepolia
  "84532": "BAS", // Base Sepolia
  "11155111": "ETH", // Sepolia
  "11155420": "OPT", // OP Sepolia
  // Mainnets
  "42161": "ARB", // Arbitrum One
  "8453": "BAS", // Base
  "1": "ETH", // Ethereum
  "10": "OPT", // Optimism
};

/**
 * 3-letter code to chain ID mapping (defaults to testnet).
 * Use getChainIdFromCode() with network context for mainnet.
 */
export const CHAIN_IDS_TESTNET: Record<string, string> = {
  ARB: "421614",
  BAS: "84532",
  ETH: "11155111",
  OPT: "11155420",
};

export const CHAIN_IDS_MAINNET: Record<string, string> = {
  ARB: "42161",
  BAS: "8453",
  ETH: "1",
  OPT: "10",
};

/**
 * Get 3-letter chain code from chain ID.
 * Returns 'UNK' for unknown chains.
 */
export function getChainCode(chainId: string | number): string {
  return CHAIN_CODES[chainId.toString()] || "UNK";
}

/**
 * Parsed serial number components.
 */
export interface ParsedSerialNumber {
  chainCode: string;
  depositIndex: number;
  changeIndex: number;
  refundIndex: number;
}

/**
 * Generate a fixed-length serial number for a note.
 *
 * Format: {CHAIN}-{DDD}-{CC}-{RR} (12 chars)
 * - CHAIN: 3-letter chain code (BAS, ARB, ETH, OPT)
 * - DDD: 3-digit deposit index (001-999), 1-indexed
 * - CC: 2-digit change index (00-99)
 * - RR: 2-digit refund index (00-99), 1-indexed when present
 *
 * @param chainId - The chain ID where the deposit originated
 * @param depositIndex - The deposit index (0-indexed)
 * @param changeIndex - The change index (0 for deposits)
 * @param refundIndex - The refund index (0-indexed), only for refund notes
 */
export function generateSerialNumber(
  chainId: string | number,
  depositIndex: number,
  changeIndex: number,
  refundIndex: number = -1
): string {
  const chain = getChainCode(chainId);
  const d = String(depositIndex + 1).padStart(3, "0");
  const c = String(changeIndex).padStart(2, "0");
  const r = refundIndex >= 0 ? String(refundIndex + 1).padStart(2, "0") : "00";

  return `${chain}-${d}-${c}-${r}`;
}

/**
 * Parse a serial number into its components.
 *
 * @param serial - The serial number string (e.g., "BAS-001-01-00")
 * @returns Parsed components or null if invalid format
 */
export function parseSerialNumber(serial: string): ParsedSerialNumber | null {
  const match = serial.match(/^([A-Z]{3})-(\d{3})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, chainCode, d, c, r] = match;
  return {
    chainCode,
    depositIndex: parseInt(d, 10) - 1, // Convert back to 0-indexed
    changeIndex: parseInt(c, 10),
    refundIndex: parseInt(r, 10) - 1, // -1 if was "00", otherwise 0-indexed
  };
}

/**
 * Get chain ID from serial number.
 *
 * @param serial - The serial number string
 * @param isMainnet - Whether to use mainnet chain IDs (default: false)
 * @returns Chain ID string or null if invalid
 */
export function getChainIdFromSerial(serial: string, isMainnet: boolean = false): string | null {
  const parsed = parseSerialNumber(serial);
  if (!parsed) return null;

  const lookup = isMainnet ? CHAIN_IDS_MAINNET : CHAIN_IDS_TESTNET;
  return lookup[parsed.chainCode] || null;
}

// ============================================================================
// Activity Metadata
// ============================================================================

/** Additional activity data stored with notes */
export interface ActivityMetadata {
  originalAmount?: string;
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
  spentNullifier1?: string; // Withdraw2 second nullifier
  newCommitment?: string;
  isSponsored?: boolean;
  ragequitTxHash?: string;
  ragequitTimestamp?: string;
  ragequitBlockNumber?: string;
  ragequitUser?: string;
  ragequitAmount?: string;
}

// ============================================================================
// Note Types
// ============================================================================

/** Common fields for all note types */
interface BaseNote {
  /** Serial number: {CHAIN}-{DDD}-{CC}-{RR} */
  serialNumber: string;
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  amount: string;
  /** Timestamp on origin chain */
  originTimestamp: string;
  /** Chain where action was triggered */
  originChainId: string;
  /** Transaction hash on origin chain */
  originTransactionHash: string;
  /** Additional activity metadata */
  activityData: ActivityMetadata;
  /** Offset where this note was discovered */
  discoveredAtOffset?: number;
}

/** Common fields for intent types (pending cross-chain operations, not actual notes) */
interface BaseIntent {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  amount: string;
  /** Timestamp on origin chain */
  originTimestamp: string;
  /** Chain where action was triggered */
  originChainId: string;
  /** Transaction hash on origin chain */
  originTransactionHash: string;
  /** Additional activity metadata */
  activityData: ActivityMetadata;
  /** Offset where this intent was discovered */
  discoveredAtOffset?: number;
  /** Target chain for fill/delivery */
  destinationChainId: string;
  /** Order ID from OIF - primary identifier for intents */
  orderId: string;
  /** Solver must fill by this time */
  fillDeadline: string;
  /** Refund available after this time */
  expires: string;
}

/** Base interface for spendable notes (label and ASP status for withdrawal proofs) */
interface SpendableNoteBase extends BaseNote {
  /** Label assigned at deposit (required for withdrawal proofs) */
  label: string;
  /** ASP vetting status */
  aspStatus: ASPStatus;
  /** unspent or spent */
  status: NoteStatus;
}

/** Same-chain deposit (spendable, changeIndex=0) */
export interface DepositNote extends SpendableNoteBase {
  noteType: "deposit";
  changeIndex: 0;
  precommitmentHash: string;
}

/** Cross-chain deposit - escrow on origin, fill on pool chain (spendable, changeIndex=0) */
export interface CrosschainDepositNote extends SpendableNoteBase {
  noteType: "crosschainDeposit";
  changeIndex: 0;
  precommitmentHash: string;
  /** Pool chain where commitment was filled */
  destinationChainId: string;
  destinationTransactionHash: string;
  destinationTimestamp: string;
}

/** Same-chain withdrawal record (terminal, sibling of ChangeNote) */
export interface WithdrawalNote extends BaseNote {
  noteType: "withdrawal";
  /** The value withdrawn to recipient */
  withdrawnAmount: string;
  recipient: string;
  /** Withdraw2 merge tracking: serialNumber -> amount */
  mergedFrom: Record<string, string>;
}

/** Remaining balance after withdrawal (spendable, sibling of WithdrawalNote) */
export interface ChangeNote extends SpendableNoteBase {
  noteType: "change";
  /** Withdraw2 merge tracking: serialNumber -> amount */
  mergedFrom: Record<string, string>;
}

/** Cross-chain withdrawal record (terminal, sibling of ChangeNote) */
export interface CrosschainWithdrawalNote extends BaseNote {
  noteType: "crosschainWithdrawal";
  /** The value withdrawn to recipient */
  withdrawnAmount: string;
  /** Destination chain where funds were delivered */
  destinationChainId: string;
  destinationTransactionHash: string;
  destinationTimestamp: string;
  recipient: string;
  /** Withdraw2 merge tracking: serialNumber -> amount */
  mergedFrom: Record<string, string>;
}

/** Refunded cross-chain withdrawal (spendable, child of WithdrawalIntentNote) */
export interface WithdrawalRefundedNote extends SpendableNoteBase {
  noteType: "withdrawalRefunded";
  refundCommitment: string;
}

/** Union of all spendable note types (with noteType for narrowing) */
export type SpendableNote =
  | DepositNote
  | CrosschainDepositNote
  | ChangeNote
  | WithdrawalRefundedNote;

/** Public withdrawal record (terminal) */
export interface RagequitNote extends BaseNote {
  noteType: "ragequit";
  /** The value ragequit to recipient */
  ragequitAmount: string;
  recipient: string;
}

/** Withdraw2 loser chain record (terminal) */
export interface MergedNote extends BaseNote {
  noteType: "merged";
  /** The value contributed to the merge */
  contributedAmount: string;
  mergedIntoSerialNumber: string;
}

/** Refunded cross-chain deposit record (terminal, child of DepositIntentNote) */
export interface DepositRefundedNote extends BaseNote {
  noteType: "depositRefunded";
  /** The value that was refunded */
  refundedAmount: string;
}

// ============================================================================
// Intent Types (pending cross-chain operations - NOT notes)
// ============================================================================

/**
 * Pending cross-chain deposit (escrowed on origin chain, changeIndex=0)
 * → Filled: CrosschainDepositNote child
 * → Refunded: DepositRefundedNote child
 */
export interface DepositIntent extends BaseIntent {
  intentType: "depositIntent";
  changeIndex: 0;
}

/**
 * Pending cross-chain withdrawal (escrowed on pool chain, sibling of ChangeNote)
 * → Filled: CrosschainWithdrawalNote child
 * → Refunded: WithdrawalRefundedNote child (spendable)
 */
export interface WithdrawalIntent extends BaseIntent {
  intentType: "withdrawalIntent";
  /** Commitment for claiming refund */
  refundCommitment: string;
  /** Merge type: '1:1' for single input, '2:1' for Withdraw2 */
  mergeType?: "1:1" | "2:1";
  /** Change index for refund note (same level as sibling ChangeNote) */
  refundChangeIndex: number;
}

/** Union of all intent types */
export type Intent = DepositIntent | WithdrawalIntent;

export type Note =
  | DepositNote
  | CrosschainDepositNote
  | WithdrawalNote
  | CrosschainWithdrawalNote
  | ChangeNote
  | WithdrawalRefundedNote
  | RagequitNote
  | MergedNote
  | DepositRefundedNote;

/** Union of notes and intents for tree nodes */
export type NoteOrIntent = Note | Intent;

// ============================================================================
// Note Tree Structure
// ============================================================================

/**
 * Tree node with parent/child relationships.
 *
 * Relationships:
 * - Deposit/CrosschainDeposit → [ChangeNote, WithdrawalNote/CrosschainWithdrawalNote]
 * - ChangeNote → [ChangeNote, WithdrawalNote/CrosschainWithdrawalNote]
 * - DepositIntent → CrosschainDepositNote | DepositRefundedNote
 * - WithdrawalIntent → CrosschainWithdrawalNote | WithdrawalRefundedNote
 * - WithdrawalRefundedNote → ChangeNote
 *
 * Terminal (no children): WithdrawalNote, CrosschainWithdrawalNote,
 * RagequitNote, MergedNote, DepositRefundedNote
 */
export interface NoteNode {
  note: NoteOrIntent;
  parent: NoteNode | null;
  children: NoteNode[];
  isTerminal: boolean;
}

/** Tree rooted at DepositNote or DepositIntent */
export interface NoteTree {
  root: NoteNode;
}

/** Serializable tree node (no circular refs) */
export interface SerializableNoteNode {
  note: NoteOrIntent;
  children: SerializableNoteNode[];
  isTerminal: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/** Check if item is an intent (not a note) */
export function isIntent(item: NoteOrIntent): item is Intent {
  return "intentType" in item;
}

/** Check if item is a note (not an intent) */
export function isNote(item: NoteOrIntent): item is Note {
  return "noteType" in item;
}

/** Check if item is a DepositIntent */
export function isDepositIntent(item: NoteOrIntent): item is DepositIntent {
  return "intentType" in item && item.intentType === "depositIntent";
}

/** Check if item is a WithdrawalIntent */
export function isWithdrawalIntent(item: NoteOrIntent): item is WithdrawalIntent {
  return "intentType" in item && item.intentType === "withdrawalIntent";
}

/** Check if a note is a WithdrawalRefundedNote */
export function isWithdrawalRefundedNote(note: Note): note is WithdrawalRefundedNote {
  return note.noteType === "withdrawalRefunded";
}

/** Check if a note is a DepositNote */
export function isDepositNote(note: Note): note is DepositNote {
  return note.noteType === "deposit";
}

/** Check if a note is a CrosschainDepositNote */
export function isCrosschainDepositNote(note: Note): note is CrosschainDepositNote {
  return note.noteType === "crosschainDeposit";
}

/** Check if a note is a CrosschainWithdrawalNote */
export function isCrosschainWithdrawalNote(note: Note): note is CrosschainWithdrawalNote {
  return note.noteType === "crosschainWithdrawal";
}

/** Check if a note is a WithdrawalNote */
export function isWithdrawalNote(note: Note): note is WithdrawalNote {
  return note.noteType === "withdrawal";
}

/** Check if a note is a ChangeNote */
export function isChangeNote(note: Note): note is ChangeNote {
  return note.noteType === "change";
}

/** Check if a note is a RagequitNote */
export function isRagequitNote(note: Note): note is RagequitNote {
  return note.noteType === "ragequit";
}

/** Check if a note is a MergedNote */
export function isMergedNote(note: Note): note is MergedNote {
  return note.noteType === "merged";
}

/** Check if a note is a DepositRefundedNote */
export function isDepositRefundedNote(note: Note): note is DepositRefundedNote {
  return note.noteType === "depositRefunded";
}

/** Check if note is spendable (has label, aspStatus, status) */
export function isSpendableNote(
  note: Note
): note is DepositNote | CrosschainDepositNote | ChangeNote | WithdrawalRefundedNote {
  return (
    note.noteType === "deposit" ||
    note.noteType === "crosschainDeposit" ||
    note.noteType === "change" ||
    note.noteType === "withdrawalRefunded"
  );
}

/** Check if note is terminal (no children allowed) */
export function isTerminalNote(note: Note): boolean {
  return (
    note.noteType === "ragequit" ||
    note.noteType === "merged" ||
    note.noteType === "withdrawal" ||
    note.noteType === "crosschainWithdrawal" ||
    note.noteType === "depositRefunded"
  );
}

/** Check if item is from a cross-chain operation */
export function isCrossChainNote(item: NoteOrIntent): boolean {
  if (isIntent(item)) {
    return true; // All intents are cross-chain
  }
  return (
    item.noteType === "crosschainDeposit" ||
    item.noteType === "crosschainWithdrawal" ||
    item.noteType === "withdrawalRefunded" ||
    item.noteType === "depositRefunded"
  );
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
export function makeChainKey(
  originChainId: string | number | bigint,
  depositIndex: number
): ChainKey {
  return `${originChainId}:${depositIndex}`;
}

/** Parse a chain key back to its components */
export function parseChainKey(key: ChainKey): { originChainId: string; depositIndex: number } {
  const [originChainId, depositIndexStr] = key.split(":");
  return { originChainId, depositIndex: parseInt(depositIndexStr, 10) };
}

export interface DiscoveryState {
  /** All discovered note trees, keyed by ChainKey (originChainId:depositIndex) */
  trees: Map<ChainKey, NoteTree>;
  /** Nullifier hash -> note location for quick lookups */
  nullifierMap: Map<string, NullifierInfo>;
  /** Next deposit index to scan per chain (keyed by chainId string) */
  nextDepositIndex: Map<string, number>;
  /** Raw activities keyed by txHash for display */
  activities: Map<string, ActivityItem>;
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
  /** Raw activities for display (already string-based, no serialization needed) */
  activities: ActivityItem[];
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
  /** Raw activities for display */
  activities: ActivityItem[];
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
  /** Activities per page fetch */
  pageSize: number;
  /** Persist state every N pages */
  persistEveryPages: number;
}

export const DEFAULT_DISCOVERY_POLICY: DiscoveryPolicy = {
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
  items: ActivityItem[];
  pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
}

export type ActivityFetcher = (
  poolAddress: string,
  limit: number,
  offset?: number,
  orderDirection?: "asc" | "desc"
) => Promise<ActivityPage>;

export interface NoteDeriver {
  derivePrecommitment(poolAddress: string, chainId: number, depositIndex: number): string;
  deriveNullifierHash(poolAddress: string, chainId: number, depositIndex: number, changeIndex: number, noteType?: string): string;
  deriveNoteCommitment(note: SpendableNote): bigint;
}

export interface StorageLayer {
  read: (accountId: string, poolAddress: string) => Promise<SerializableDiscoveryState | null>;
  write: (
    accountId: string,
    poolAddress: string,
    state: SerializableDiscoveryState
  ) => Promise<void>;
}
