/**
 * Note Selection Hook
 * Handles note discovery and selection for withdrawals
 */

import { useState, useEffect, useMemo } from "react";
import { useCachedNotes } from "@/hooks/notes/useCachedNotes";
import type { Note } from "@/lib/storage/types";

export function useNoteSelection(
  publicKey: string,
  poolAddress: string,
  preSelectedNote?: Note | null
) {
  const { data: noteDiscovery, loading: isLoadingNotes } = useCachedNotes(publicKey, poolAddress);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Filter for available (unspent and activated) notes
  const availableNotes = useMemo(() => {
    return (
      (noteDiscovery?.notes
        ?.map((noteChain) => {
          const lastNote = noteChain[noteChain.length - 1];
          return lastNote.status === "unspent" && lastNote.isActivated ? lastNote : null;
        })
        .filter(Boolean) as Note[]) || []
    );
  }, [noteDiscovery]);

  // Handle pre-selected note
  // Used for deep links or returning users only - not for auto-selection
  // User must still explicitly select a note in normal flow
  useEffect(() => {
    if (preSelectedNote && preSelectedNote.status === "unspent" && preSelectedNote.isActivated) {
      setSelectedNote(preSelectedNote);
    }
  }, [preSelectedNote]);

  return {
    availableNotes,
    selectedNote,
    setSelectedNote,
    isLoadingNotes,
  };
}
