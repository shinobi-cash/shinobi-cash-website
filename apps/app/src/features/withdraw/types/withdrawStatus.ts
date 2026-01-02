/**
 * Withdrawal Status Types
 * Semantic status representation for state machine
 */

// ============ STATUS ENUM ============

/**
 * Withdrawal status enum - semantic state machine
 * Enables i18n, A/B testing, and UI-agnostic controllers
 */
export type WithdrawStatus =
  | "idle" // Initial state, no action
  | "no-note-selected" // User needs to select a note
  | "invalid-amount" // Amount validation failed
  | "invalid-address" // Recipient address validation failed
  | "preparing-proof" // Generating ZK proof
  | "proof-failed" // Proof generation failed
  | "ready" // Ready to execute
  | "submitting" // Transaction being submitted
  | "submitted"; // Transaction submitted (hash received)

// ============ STATUS LABELS ============

/**
 * UI labels for each status
 * Button text provides contextual feedback - tells user exactly what to do next
 * Separated from status enum to allow i18n and A/B testing
 */
export const WITHDRAW_STATUS_LABELS: Record<WithdrawStatus, string> = {
  idle: "Enter Amount and Recipient",
  "no-note-selected": "Select Note to Continue",
  "invalid-amount": "Enter Valid Amount",
  "invalid-address": "Enter Valid Recipient Address",
  "preparing-proof": "Preparing Proof...",
  "proof-failed": "Proof Generation Failed - Retry",
  ready: "Preview Withdrawal",
  submitting: "Submitting Transaction...",
  submitted: "Transaction Submitted",
};

// ============ ERROR DOMAINS ============

/**
 * Error domain typing - discriminated union
 * Allows UI to handle different error types appropriately
 */
export type WithdrawError =
  | { type: "validation"; message: string } // Form validation errors
  | { type: "proof"; message: string } // ZK proof generation errors
  | { type: "transaction"; message: string } // Transaction execution errors
  | { type: "note"; message: string } // Note selection/availability errors
  | null;
