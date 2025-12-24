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
 * Separated from status enum to allow i18n and A/B testing
 * Component owns these labels, not the controller
 */
export const WITHDRAW_STATUS_LABELS: Record<WithdrawStatus, string> = {
  idle: "Preview Withdrawal",
  "no-note-selected": "Select Note to Continue",
  "invalid-amount": "Invalid Amount",
  "invalid-address": "Invalid Address",
  "preparing-proof": "Preparing...",
  "proof-failed": "Proof Failed",
  ready: "Preview Withdrawal",
  submitting: "Executing...",
  submitted: "Submitted",
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
