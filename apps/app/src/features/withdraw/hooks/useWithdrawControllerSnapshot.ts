/**
 * useWithdrawControllerSnapshot - React adapter for WithdrawController
 * Thin adapter that syncs React/Wagmi state to controller and returns read-only snapshot
 * Follows Auth & Deposit pattern: controller is domain-driven, hook is just a React bridge
 */

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { WithdrawController } from "../controllers/WithdrawController";
import { useCryptoContext } from "@/hooks/useCryptoContext";
import { useCachedNotes } from "@/hooks/notes/useCachedNotes";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { getAvailableNotes } from "@/features/notes/protocol/noteFiltering";

/**
 * Read-only snapshot of WithdrawController state
 * Syncs crypto and notes contexts from React to controller
 * NO wallet syncing - withdrawal uses Account Abstraction!
 *
 * This hook:
 * - Does NOT contain business logic
 * - Does NOT orchestrate flows
 * - Only bridges React state → controller
 *
 * @returns Read-only snapshot from WithdrawController
 */
export function useWithdrawControllerSnapshot() {
  const snapshot = useSnapshot(WithdrawController.state);

  // Crypto context (from AccountService via useCryptoContext)
  const { publicKey, accountKey, cryptoReady } = useCryptoContext();

  // Notes context (from useCachedNotes, read-only)
  const poolAddress = SHINOBI_CASH_ETH_POOL.address;
  const { data: cachedNotesData, loading: notesLoading } = useCachedNotes(
    publicKey ?? "",
    poolAddress
  );

  // Sync crypto context to controller
  useEffect(() => {
    WithdrawController._updateCrypto({
      publicKey,
      accountKey,
      cryptoReady,
    });
  }, [publicKey, accountKey, cryptoReady]);

  // Sync notes context to controller (read-only)
  // Convert NoteChain[] to Note[] by extracting available notes
  useEffect(() => {
    const noteChains = cachedNotesData?.notes ?? [];
    const availableNotes = getAvailableNotes(noteChains);

    WithdrawController._updateNotes({
      notes: availableNotes,
      isLoading: notesLoading,
    });
  }, [cachedNotesData?.notes, notesLoading]);

  return snapshot;
}
