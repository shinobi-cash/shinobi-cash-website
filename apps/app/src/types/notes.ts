import type { NoteCategory as CoreNoteCategory } from "@shinobi-cash/core/discovery";

export type NoteCategory = CoreNoteCategory;

export type NotesStatus = "idle" | "loading" | "error" | "empty" | "ready";

export type NotesError =
  | { type: "discovery"; message: string }
  | { type: "storage"; message: string }
  | { type: "network"; message: string }
  | null;

/**
 * Filter type for note list tabs
 * Only spendable + pending - spent notes are viewed via Activity tab
 */
export type NoteFilter = "spendable" | "pending";

export const NOTE_FILTER_LABELS: Record<NoteFilter, string> = {
  spendable: "Spendable",
  pending: "Pending",
};
