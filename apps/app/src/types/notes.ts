import { Note, NoteChain } from "@shinobi-cash/core";

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

export type NoteFilter = "available" | "pending" | "spent";

export const NOTE_FILTER_LABELS: Record<NoteFilter, string> = {
  available: "Available",
  pending: "Pending",
  spent: "Spent",
};
