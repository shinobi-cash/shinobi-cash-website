/**
 * Withdrawal Feature - Public API
 * This is the ONLY file that external code should import from
 *
 * Usage:
 * import { WithdrawalForm, useWithdrawController } from '@/features/withdraw';
 */

// Components (UI)
export { WithdrawalForm } from "./components/WithdrawalForm";

// Controller (Feature Orchestrator)
export { useWithdrawController } from "./controller/useWithdrawController";
export type { WithdrawController } from "./controller/useWithdrawController";

// Types (Public types only)
export type { WithdrawStatus, WithdrawError } from "./types";
export { WITHDRAW_STATUS_LABELS } from "./types";

// Protocol (Chain logic - rarely needed outside feature)
export {
  resolveWithdrawRoute,
  isWithdrawSupported,
  getDefaultRelayFeeBps,
  getDefaultSolverFeeBps,
} from "./protocol/withdrawRoute";
export type { WithdrawRoute, WithdrawCallData } from "./protocol/withdrawRoute";

export {
  calculateExecutionFee,
  calculateSolverFee,
  calculateReceiveAmount,
  formatWithdrawAmountsForDisplay,
} from "./protocol/withdrawFees";
export type { WithdrawFeeBreakdown } from "./protocol/withdrawFees";

// Constants
export { DISPLAY_DECIMALS, ETH_ASSET } from "./constants";
