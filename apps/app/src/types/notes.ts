import type { NoteTree, NoteCategory } from "@shinobi-cash/core/discovery";

export type NotesStatus = "idle" | "loading" | "error" | "empty" | "ready";

export type NotesError =
  | { type: "discovery"; message: string }
  | { type: "storage"; message: string }
  | { type: "network"; message: string }
  | null;

export interface NoteTreeView {
  tree: NoteTree;
  key: string;
}

/**
 * Filter type for note list tabs
 */
export type NoteFilter = NoteCategory;

export const NOTE_FILTER_LABELS: Record<NoteFilter, string> = {
  spendable: "Spendable",
  pending: "Pending",
  spent: "Spent",
};
