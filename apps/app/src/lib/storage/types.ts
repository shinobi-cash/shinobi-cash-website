/**
 * App-Specific Storage Types Export
 *
 * Note: Core types (Note, NoteChain, CachedNoteData, DiscoveryResult, EncryptedData)
 * should be imported from @shinobi-cash/core directly
 */

// Re-export app-specific types only
export type {
  CachedAccountData,
  NamedPasskeyData,
  SessionInfo,
} from "./interfaces/IDataTypes";
