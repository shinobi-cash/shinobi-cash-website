/**
 * Types for Activity Details Screen
 */

import type { Note, NoteTree } from "@shinobi-cash/core/discovery";
import type { ActivityEntry } from "@/types/activity";

export interface ActivityDetailsScreenProps {
  entry: ActivityEntry | null;
  onBack: () => void;
  onViewNoteChain?: (note: Note) => void;
  allTrees?: NoteTree[];
}

export interface InputNote {
  serialNumber: string;
  amount: string;
  note: Note | null;
}

export interface WithdrawalNotes {
  inputNotes: InputNote[];
  changeNote: Note | null;
}
