/**
 * Deposit Status Enum
 * Semantic status representation for deposit flow
 * Keeps controller logic-focused and UI presentation-focused
 */

export type DepositStatus =
  | "idle"
  | "wallet-disconnected"
  | "preparing"
  | "unsupported-network"
  | "insufficient-balance"
  | "invalid-amount"
  | "gas-estimation-failed"
  | "estimating-gas"
  | "ready"
  | "submitting";

/**
 * Deposit Error with Domain
 * Distinguishes between different failure types
 */
export type DepositError =
  | { type: "transaction"; message: string }
  | { type: "gas"; message: string }
  | { type: "commitment"; message: string }
  | null;

/**
 * Maps deposit status to user-facing button labels
 * Button text provides contextual feedback - tells user exactly what to do next
 * UI can override these for i18n, A/B testing, or custom messaging
 */
export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  idle: "Enter Amount to Deposit",
  "wallet-disconnected": "Connect Wallet to Continue",
  preparing: "Preparing Deposit...",
  "unsupported-network": "Switch to Supported Network",
  "insufficient-balance": "Insufficient Balance",
  "invalid-amount": "Enter Valid Amount",
  "gas-estimation-failed": "Gas Estimation Failed - Try Again",
  "estimating-gas": "Estimating Gas...",
  ready: "Deposit",
  submitting: "Submitting Deposit...",
};
