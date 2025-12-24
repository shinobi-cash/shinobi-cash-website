/**
 * Note Filtering Protocol
 * Pure functions for filtering and counting notes
 * No side effects, no UI dependencies
 */

import type { Note, NoteChain } from "@/lib/storage/types";
import type { NoteFilter } from "../types/filters";

// Re-export for backward compatibility
export type { NoteFilter } from "../types/filters";

/**
 * Get the last note from a note chain
 * Pure helper function
 */
export function getLastNote(noteChain: NoteChain): Note {
  return noteChain[noteChain.length - 1];
}

/**
 * Check if a note is available (unspent and activated)
 * Pure function - no side effects
 */
export function isNoteAvailable(note: Note): boolean {
  return note.status === "unspent" && note.isActivated;
}

/**
 * Check if a note is pending (unspent but not activated)
 * Pure function - no side effects
 */
export function isNotePending(note: Note): boolean {
  return note.status === "unspent" && !note.isActivated;
}

/**
 * Check if a note is spent
 * Pure function - no side effects
 */
export function isNoteSpent(note: Note): boolean {
  return note.status === "spent";
}

// ============ FILTERING FUNCTIONS ============

/**
 * Filter note chains by status
 * Pure function - creates new array
 *
 * @param noteChains - Array of note chains to filter
 * @param filter - Filter type to apply
 * @returns Filtered array of note chains
 */
export function filterNoteChains(noteChains: NoteChain[], filter: NoteFilter): NoteChain[] {
  return noteChains.filter((noteChain) => {
    const lastNote = getLastNote(noteChain);

    switch (filter) {
      case "available":
        return isNoteAvailable(lastNote);
      case "pending":
        return isNotePending(lastNote);
      case "spent":
        return isNoteSpent(lastNote);
      default:
        return false;
    }
  });
}

/**
 * Count note chains by filter type
 * Pure function - no mutations
 *
 * @param noteChains - Array of note chains to count
 * @param filter - Filter type to count
 * @returns Number of matching note chains
 */
export function countNoteChains(noteChains: NoteChain[], filter: NoteFilter): number {
  return filterNoteChains(noteChains, filter).length;
}

/**
 * Get comprehensive note counts for all filter types
 * Pure function - single pass through array
 *
 * @param noteChains - Array of note chains
 * @returns Object with counts for each filter type
 */
export function getNoteChainCounts(noteChains: NoteChain[]): Record<NoteFilter, number> {
  return noteChains.reduce(
    (counts, noteChain) => {
      const lastNote = getLastNote(noteChain);

      if (isNoteAvailable(lastNote)) {
        counts.available++;
      } else if (isNotePending(lastNote)) {
        counts.pending++;
      } else if (isNoteSpent(lastNote)) {
        counts.spent++;
      }

      return counts;
    },
    { available: 0, pending: 0, spent: 0 } as Record<NoteFilter, number>
  );
}

/**
 * Sort note chains by timestamp (newest first)
 * Pure function - creates new sorted array
 *
 * @param noteChains - Array of note chains to sort
 * @returns New sorted array (does not mutate original)
 */
export function sortNoteChainsByTimestamp(noteChains: NoteChain[]): NoteChain[] {
  return [...noteChains].sort((a, b) => {
    const lastNoteA = getLastNote(a);
    const lastNoteB = getLastNote(b);
    return Number(lastNoteB.timestamp) - Number(lastNoteA.timestamp);
  });
}

/**
 * Filter note chains to only available (withdrawable) notes
 * Convenience function for common use case
 *
 * @param noteChains - Array of note chains
 * @returns Only available note chains
 */
export function getAvailableNoteChains(noteChains: NoteChain[]): NoteChain[] {
  return filterNoteChains(noteChains, "available");
}

/**
 * Get available notes (not chains)
 * Extracts last note from each available chain
 *
 * @param noteChains - Array of note chains
 * @returns Array of available notes
 */
export function getAvailableNotes(noteChains: NoteChain[]): Note[] {
  return getAvailableNoteChains(noteChains).map(getLastNote);
}
