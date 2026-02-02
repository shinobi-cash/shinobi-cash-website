/**
 * Discovery Types
 */

import type { ASPStatus, IntentStatus } from '@shinobi-cash/data';

// ============================================================================
// Note Types
// ============================================================================

/** Note status including merged for Withdraw2 */
export type NoteStatus = 'unspent' | 'spent' | 'merged';

interface BaseNote {
  poolAddress: string;
  depositIndex: number;
  amount: string;
  originTransactionHash: string;
  destinationTransactionHash: string;
  originChainId: string;
  destinationChainId: string;
  blockNumber: string;
  timestamp: string;
  status: NoteStatus;
  aspStatus: ASPStatus;
  label: string;
  isCrossChain: boolean;
  orderId?: string;
  intentStatus?: IntentStatus;
  fillDeadline?: string;
  expires?: string;
  activityData: {
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
    newCommitment?: string;
    isSponsored?: boolean;
  };
}

/** Deposit note - the first note in a chain */
export interface DepositNote extends BaseNote {
  noteType: 'deposit';
  changeIndex: 0;
  refundIndex?: never;
  refundCommitment?: never;
  precommitmentHash: string;
}

/** Change note - created from withdrawals */
export interface ChangeNote extends BaseNote {
  noteType: 'change';
  changeIndex: number;
  refundIndex?: never;
  precommitmentHash?: never;
  refundCommitment?: string;
}

/** Refund note - created from failed cross-chain withdrawals */
export interface RefundNote extends BaseNote {
  noteType: 'refund';
  changeIndex: number;
  refundIndex: number;
  precommitmentHash?: never;
  refundCommitment: string;
}

export type Note = DepositNote | ChangeNote | RefundNote;
export type NoteChain = Note[];

// ============================================================================
// Discovery State
// ============================================================================

export interface LiveDeposit {
  depositIndex: number;
  chain: NoteChain;
  remaining: bigint;
}

export interface DiscoveryState {
  notes: NoteChain[];
  nextDepositIndex: number;
  liveDeposits: LiveDeposit[];
  offset?: number;
  newDepositsFound: number;
}

export interface DiscoveryResult {
  notes: NoteChain[];
  lastUsedIndex: number;
  newNotesFound: number;
  lastProcessedOffset?: number;
}

export interface DiscoveryProgress {
  pagesProcessed: number;
  currentPageActivityCount: number;
  depositsChecked: number;
  depositsMatched: number;
  lastOffset?: number;
  complete: boolean;
}

export interface DiscoveryPolicy {
  maxDepositScan: number;
  pageSize: number;
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
