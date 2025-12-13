/**
 * Refactored Storage Types Export
 * Provides clean type imports without storage coupling
 */

// Re-export types for external usage
export type {
  Note,
  NoteChain,
  CachedNoteData,
  CachedAccountData,
  NamedPasskeyData,
  DiscoveryResult,
  SessionInfo,
} from "./interfaces/IDataTypes";
