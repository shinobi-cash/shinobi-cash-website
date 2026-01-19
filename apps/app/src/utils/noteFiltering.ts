import type { Note, NoteChain } from "@shinobi-cash/core";
import type { NoteFilter, ReadonlyNoteChain } from "@/types/notes";

export function getLastNote(noteChain: ReadonlyNoteChain): Note {
  if (noteChain.length === 0) {
    throw new Error("Invariant violation: empty NoteChain");
  }
  return noteChain[noteChain.length - 1];
}

export function isNoteAvailable(note: Note): boolean {
  return note.status === "unspent" && note.isActivated && note.aspStatus === "approved";
}

export function isNotePending(note: Note): boolean {
  return note.status === "unspent" && (!note.isActivated || note.aspStatus === "pending");
}

export function isNoteSpent(note: Note): boolean {
  return note.status === "spent";
}

export function filterNoteChains(
  noteChains: readonly ReadonlyNoteChain[],
  filter: NoteFilter
): ReadonlyNoteChain[] {
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

export function countNoteChains(noteChains: NoteChain[], filter: NoteFilter): number {
  return filterNoteChains(noteChains, filter).length;
}

export function getNoteChainCounts(noteChains: NoteChain[]): {
  available: number;
  pending: number;
  spent: number;
} {
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
    { available: 0, pending: 0, spent: 0 }
  );
}

export function sortNoteChainsByTimestamp(noteChains: ReadonlyNoteChain[]): ReadonlyNoteChain[] {
  return [...noteChains].sort((a, b) => {
    const lastNoteA = getLastNote(a);
    const lastNoteB = getLastNote(b);
    return Number(lastNoteB.timestamp) - Number(lastNoteA.timestamp);
  });
}

export function getAvailableNoteChains(noteChains: ReadonlyNoteChain[]): ReadonlyNoteChain[] {
  return filterNoteChains(noteChains, "available");
}

export function getAvailableNotes(noteChains: NoteChain[]): Note[] {
  return getAvailableNoteChains(noteChains).map(getLastNote);
}
