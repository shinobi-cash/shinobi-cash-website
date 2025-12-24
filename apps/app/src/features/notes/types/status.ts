/**
 * Notes Status Types
 * Semantic status representation for state machine
 */

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
