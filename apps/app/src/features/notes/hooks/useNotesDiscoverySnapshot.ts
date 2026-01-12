/**
 * Notes Discovery Snapshot - React Adapter
 * Syncs React world with NotesDiscoveryController
 */

"use client";

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { useTransactionTracking } from "@/hooks/useTransactionTracking";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

/**
 * React adapter hook for NotesDiscoveryController
 *
 * Responsibilities:
 * 1. Subscribe to controller state via valtio
 * 2. Listen for transaction indexed events and refresh
 *
 * Note: Discovery is handled by background worker (NotesBackgroundBootstrap)
 * This hook only subscribes to updates and triggers refresh on new transactions
 *
 * @returns Snapshot of discovery controller state (read-only)
 */
export function useNotesDiscoverySnapshot() {
  // Subscribe to controller state (valtio makes this reactive)
  const snapshot = useSnapshot(NotesDiscoveryController.state);

  // Listen for transaction indexed events and refresh
  const { onTransactionIndexed } = useTransactionTracking();

  useEffect(() => {
    return onTransactionIndexed(() => {
      NotesDiscoveryController.refresh();
    });
  }, [onTransactionIndexed]);

  return snapshot;
}
