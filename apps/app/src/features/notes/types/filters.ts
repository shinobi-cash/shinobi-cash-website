/**
 * Notes Filter Types
 * Type-safe filter enums and labels
 */

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
