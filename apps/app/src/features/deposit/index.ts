/**
 * Deposit Feature - Public API
 * This is the ONLY file that external code should import from
 *
 * Usage:
 * import { DepositForm, useDepositController } from '@/features/deposit';
 */

// Components (UI)
export { DepositForm } from "./components/DepositForm";
export { NetworkWarning } from "./components/NetworkWarning";

// Controller (Feature Orchestrator)
export { useDepositController } from "./controller/useDepositController";
export type { DepositController } from "./controller/useDepositController";

// Types (Public types only)
export type { DepositStatus, DepositError } from "./types/depositStatus";
export { DEPOSIT_STATUS_LABELS } from "./types/depositStatus";

// Protocol (Chain logic - rarely needed outside feature)
export {
  resolveDepositRoute,
  buildDepositCallParams,
  isDepositSupported,
} from "./protocol/depositRoute";
export type { DepositRoute, DepositCallParams } from "./protocol/depositRoute";

export {
  calculateComplianceFee,
  calculateDepositNoteAmount,
  formatDepositAmountsForDisplay,
} from "./protocol/depositFees";
