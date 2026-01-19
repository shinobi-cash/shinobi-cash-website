/**
 * Notes Types - Public Exports
 */

import { Note, NoteChain } from "@shinobi-cash/core";

/**
 * Readonly view of a NoteChain (snapshot-safe)
 */
export type ReadonlyNoteChain = readonly Readonly<Note>[];

// Status types
// ============ STATUS ENUM ============

/**
 * Notes view status enum - semantic state machine
 * Enables i18n, A/B testing, and UI-agnostic controllers
 */
export type NotesStatus =
  | "idle" // Initial state
  | "loading" // Discovering notes
  | "error" // Discovery failed
  | "empty" // No notes found
  | "ready"; // Notes loaded successfully

// ============ STATUS LABELS ============

/**
 * UI labels for each status
 * Separated from status enum to allow i18n and A/B testing
 */
export const NOTES_STATUS_LABELS: Record<NotesStatus, string> = {
  idle: "Notes",
  loading: "Discovering notes...",
  error: "Failed to load notes",
  empty: "No notes found",
  ready: "Notes",
};

// Error types
// ============ ERROR DOMAINS ============

/**
 * Error domain typing - discriminated union
 * Allows UI to handle different error types appropriately
 *
 * Current implementation status:
 * - discovery: ✅ Implemented in useNotesController
 * - storage: 🚧 TODO: Wire up storage/cache errors
 * - network: 🚧 TODO: Wire up network/RPC errors
 */
export type NotesError =
  | { type: "discovery"; message: string } // Note discovery errors
  | { type: "storage"; message: string } // Storage/cache errors (TODO)
  | { type: "network"; message: string } // Network/RPC errors (TODO)
  | null;

// View models

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

// Filter types
// ============ FILTER TYPE ============

/**
 * Type-safe filter for note status
 * Used to filter notes by their current state
 */
export type NoteFilter = "available" | "pending" | "spent";

// ============ FILTER LABELS ============

/**
 * UI labels for note filters
 * Separated to allow i18n
 */
export const NOTE_FILTER_LABELS: Record<NoteFilter, string> = {
  available: "Available",
  pending: "Pending",
  spent: "Spent",
};
