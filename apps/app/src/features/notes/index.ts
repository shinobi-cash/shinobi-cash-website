/**
 * Notes Feature - Public API
 * This is the ONLY file that external code should import from
 *
 * Usage:
 * import { useNotesController, NotesSection } from '@/features/notes';
 */

// Components (UI)
export { NotesSection } from "./components/NotesSection";

// Controller (Feature Orchestrator)
export { useNotesController } from "./controller/useNotesController";
export type { NotesController } from "./controller/useNotesController";

// Types (Public types only)
export type { NotesStatus, NotesError, NoteFilter, NoteChainView, Note, NoteChain } from "./types";
export { NOTES_STATUS_LABELS, NOTE_FILTER_LABELS } from "./types";

// Protocol (Chain logic - rarely needed outside feature)
export {
  filterNoteChains,
  countNoteChains,
  getNoteChainCounts,
  sortNoteChainsByTimestamp,
  getAvailableNoteChains,
  getAvailableNotes,
  isNoteAvailable,
  isNotePending,
  isNoteSpent,
  getLastNote,
} from "./protocol/noteFiltering";
