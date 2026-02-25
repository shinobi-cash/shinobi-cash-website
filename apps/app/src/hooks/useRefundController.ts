/**
 * useRefundController - React adapter for RefundController
 * Provides read-only snapshot of controller state
 */

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { RefundController, RefundSelectors } from "@/controllers/RefundController";

export function useRefundController() {
  const snapshot = useSnapshot(RefundController.state);

  // Reset controller on unmount (navigation away) — skip if transaction in flight
  useEffect(() => {
    return () => {
      const { status } = RefundController.state.state;
      if (status !== "submitting" && status !== "confirming") {
        RefundController.reset();
      }
    };
  }, []);

  return {
    ...snapshot,
    isInProgress: RefundSelectors.isInProgress(),
    intent: RefundSelectors.getIntent(),
    refundType: RefundSelectors.getRefundType(),
  };
}
