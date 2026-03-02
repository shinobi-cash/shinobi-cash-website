/**
 * useWithdrawControllerSnapshot - React adapter for WithdrawController
 * Thin adapter that syncs notes context from React to controller
 * Follows Auth & Deposit pattern: controller is domain-driven, hook is just a React bridge
 */

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { useNotesDiscovery } from "@/hooks/useNotesDiscovery";
import { WithdrawController } from "@/controllers/WithdrawController";
import { NotesDiscoverySelectors } from "@/controllers/NotesDiscoveryController";
import { useControllerCleanup } from "@/hooks/useControllerCleanup";

/**
 * Read-only snapshot of WithdrawController state
 * Syncs notes context from React to controller
 * Crypto context is read directly from AuthController by the controller
 * NO wallet syncing - withdrawal uses Account Abstraction!
 *
 * This hook:
 * - Does NOT contain business logic
 * - Does NOT orchestrate flows
 * - Only bridges React state → controller
 *
 * @returns Read-only snapshot from WithdrawController
 */
export function useWithdrawController() {
  const snapshot = useSnapshot(WithdrawController.state);

  useControllerCleanup(WithdrawController, ["submitting"]);

  // Notes context (from NotesDiscoveryController - single source of truth)
  const discoveryState = useNotesDiscovery();

  // Sync notes context to controller (read-only)
  // Get withdrawable notes from discovery controller (ASP approved only)
  useEffect(() => {
    const withdrawableNotes = NotesDiscoverySelectors.getWithdrawableNotes();
    const isLoading = NotesDiscoverySelectors.isDiscovering();

    WithdrawController._updateNotes({
      notes: withdrawableNotes,
      isLoading,
    });
  }, [discoveryState.noteTrees, discoveryState.state.status]);

  return snapshot;
}
