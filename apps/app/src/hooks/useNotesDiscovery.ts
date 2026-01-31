/**
 * Notes Discovery Snapshot - React Adapter
 * Syncs React world with NotesDiscoveryController
 */

"use client";

import { useSnapshot } from "valtio";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

/**
 * React adapter hook for NotesDiscoveryController
 *
 * Responsibilities:
 * 1. Subscribe to controller state via valtio
 *
 * Note: Discovery is handled by background worker via NotesDiscoveryController.
 * Deposit and withdrawal controllers trigger refresh after transaction confirmation.
 *
 * @returns Snapshot of discovery controller state (read-only)
 */
export function useNotesDiscovery() {
  return useSnapshot(NotesDiscoveryController.state);
}
