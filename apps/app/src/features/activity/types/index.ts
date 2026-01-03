/**
 * Activity Types
 *
 * Activities are derived from notes in note chains.
 * Each note represents a distinct activity (deposit, withdrawal, or refund).
 */

import type { ASPStatus } from "@shinobi-cash/data";

/**
 * Activity type derived from note type
 */
export type ActivityType = "deposit" | "withdrawal" | "refund";

/**
 * Activity filter options
 */
export type ActivityFilter = "all" | "deposit" | "withdrawal" | "refund";

/**
 * Activity derived from a note
 */
export interface Activity {
  // Identification
  id: string; // `${depositIndex}-${changeIndex}`
  type: ActivityType;

  // Amount
  amount: string; // In wei

  // Timestamps
  timestamp: string;
  blockNumber: string;

  // Status
  status: "unspent" | "spent";
  aspStatus: ASPStatus;
  isActivated: boolean;

  // Transaction details
  originTransactionHash: string;
  destinationTransactionHash: string;

  // Chain info
  originChainId: string;
  destinationChainId: string;
  isCrossChain: boolean;

  // Pool and indices
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;

  // Labels
  label: string;
}

/**
 * Activity status for UI
 */
export type ActivityStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "empty" }
  | { type: "ready" };

/**
 * Activity filter labels for UI
 */
export const ACTIVITY_FILTER_LABELS: Record<ActivityFilter, string> = {
  all: "All",
  deposit: "Deposits",
  withdrawal: "Withdrawals",
  refund: "Refunds",
};

/**
 * Activity type labels for UI
 */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  refund: "Refund",
};
