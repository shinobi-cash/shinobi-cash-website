/**
 * useRefundController - React adapter for RefundController
 * Provides read-only snapshot of controller state
 */

import { useSnapshot } from "valtio";
import { RefundController, RefundSelectors } from "@/controllers/RefundController";

export function useRefundController() {
  const snapshot = useSnapshot(RefundController.state);

  return {
    ...snapshot,
    isInProgress: RefundSelectors.isInProgress(),
    intent: RefundSelectors.getIntent(),
    refundType: RefundSelectors.getRefundType(),
  };
}
