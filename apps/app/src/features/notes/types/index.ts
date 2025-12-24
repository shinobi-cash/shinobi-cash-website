/**
 * Notes Types - Public Exports
 */

// Status types
export type { NotesStatus } from "./status";
export { NOTES_STATUS_LABELS } from "./status";

// Error types
export type { NotesError } from "./errors";

// View models
export type { NoteChainView } from "./viewModels";

// Filter types
export type { NoteFilter } from "./filters";
export { NOTE_FILTER_LABELS } from "./filters";

// Re-export commonly used types from storage
export type { Note, NoteChain, DiscoveryResult } from "@/lib/storage/types";
