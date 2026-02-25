/**
 * useRagequitController - React adapter for RagequitController
 * Provides read-only snapshot of controller state
 */

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { RagequitController, RagequitSelectors } from "@/controllers/RagequitController";

/**
 * Read-only snapshot of RagequitController state
 *
 * @returns Read-only snapshot from RagequitController plus selectors
 */
export function useRagequitController() {
  const snapshot = useSnapshot(RagequitController.state);

  // Reset controller on unmount (navigation away) — skip if transaction in flight
  useEffect(() => {
    return () => {
      const { status } = RagequitController.state.state;
      if (status !== "submitting" && status !== "confirming") {
        RagequitController.reset();
      }
    };
  }, []);

  return {
    ...snapshot,
    canRagequit: RagequitSelectors.canRagequit(),
    isInProgress: RagequitSelectors.isInProgress(),
  };
}
