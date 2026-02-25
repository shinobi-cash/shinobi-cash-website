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
 * @returns Snapshot of discovery controller state (read-only)
 */
export function useNotesDiscovery() {
  return useSnapshot(NotesDiscoveryController.state);
}
