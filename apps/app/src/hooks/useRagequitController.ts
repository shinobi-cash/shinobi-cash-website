/**
 * useRagequitController - React adapter for RagequitController
 * Provides read-only snapshot of controller state
 */

import { useSnapshot } from "valtio";
import { RagequitController, RagequitSelectors } from "@/controllers/RagequitController";

/**
 * Read-only snapshot of RagequitController state
 *
 * @returns Read-only snapshot from RagequitController plus selectors
 */
export function useRagequitController() {
  const snapshot = useSnapshot(RagequitController.state);

  return {
    ...snapshot,
    canRagequit: RagequitSelectors.canRagequit(),
    isInProgress: RagequitSelectors.isInProgress(),
  };
}
