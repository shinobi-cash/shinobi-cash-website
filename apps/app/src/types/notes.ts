import type { Note, NoteChain } from "@shinobi-cash/core/discovery";

export type ReadonlyNoteChain = readonly Readonly<Note>[];

export type NotesStatus = "idle" | "loading" | "error" | "empty" | "ready";

export type NotesError =
  | { type: "discovery"; message: string }
  | { type: "storage"; message: string }
  | { type: "network"; message: string }
  | null;

export interface NoteChainView {
  chain: NoteChain;
  lastNote: Note;
  length: number;
  key: string;
}

/**
 * Note category for the 3-category model
 * - spendable: User can take action (withdraw or ragequit)
 * - pending: Waiting for something (solver, ASP approval)
 * - spent: Already used or refunded
 */
export type NoteCategory = "spendable" | "pending" | "spent";

/**
 * Filter type for note list tabs
 */
export type NoteFilter = NoteCategory;

export const NOTE_FILTER_LABELS: Record<NoteFilter, string> = {
  spendable: "Spendable",
  pending: "Pending",
  spent: "Spent",
};
