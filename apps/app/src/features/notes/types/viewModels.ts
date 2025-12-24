/**
 * Notes View Models
 * Pre-computed views for UI rendering
 */

import type { Note, NoteChain } from "@/lib/storage/types";

// ============ VIEW MODEL ============

/**
 * Note chain view model for UI rendering
 * Pre-computed view to eliminate domain logic from components
 * UI just renders, doesn't make domain decisions like "getLastNote"
 */
export interface NoteChainView {
  /** The full note chain */
  chain: NoteChain;
  /** The last note in the chain (pre-computed for UI) */
  lastNote: Note;
  /** Chain length (number of notes) */
  length: number;
  /** Unique key for React rendering */
  key: string;
}
