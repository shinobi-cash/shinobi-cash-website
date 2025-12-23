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
 * UI can override these for i18n, A/B testing, or custom messaging
 */
export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  idle: "Deposit",
  "wallet-disconnected": "Connect Wallet",
  preparing: "Preparing...",
  "unsupported-network": "Unsupported Network",
  "insufficient-balance": "Insufficient Balance",
  "invalid-amount": "Enter Amount",
  "gas-estimation-failed": "Cannot Estimate Gas",
  "estimating-gas": "Estimating...",
  ready: "Deposit",
  submitting: "Depositing...",
};
