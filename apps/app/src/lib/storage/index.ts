/**
 * Storage Library - Main Export
 *
 * Provides secure encrypted storage with improved organization and maintainability
 */

// ============ MAIN STORAGE MANAGER ============
export { storageManager, storageManager as noteCache } from "./StorageManager";

// ============ DATA TYPES ============
export type {
  Note,
  NoteChain,
  CachedNoteData,
  CachedAccountData,
  NamedPasskeyData,
  DiscoveryResult,
  SessionInfo,
} from "./interfaces/IDataTypes";

// ============ STORAGE INTERFACES ============
export type {
  IStorageAdapter,
  IBrowserStorageAdapter,
  IEncryptedStorageAdapter,
} from "./interfaces/IStorageAdapter";

// ============ ADAPTERS ============
export {
  BrowserStorageAdapter,
  localStorageAdapter,
  sessionStorageAdapter,
} from "./adapters/BrowserStorageAdapter";

export {
  IndexedDBAdapter,
  notesStorageAdapter,
  accountStorageAdapter,
  passkeyStorageAdapter,
} from "./adapters/IndexedDBAdapter";

// ============ REPOSITORIES ============
export { AccountRepository } from "./repositories/AccountRepository";
export { NotesRepository } from "./repositories/NotesRepository";
export { PasskeyRepository } from "./repositories/PasskeyRepository";
export { SessionRepository } from "./repositories/SessionRepository";

// ============ SERVICES ============
export { KDF } from "./services/KeyDerivationService";
export { EncryptionService } from "./services/EncryptionService";

/**
 * USAGE EXAMPLES:
 *
 * // Main storage manager (recommended):
 * import { storageManager } from "@/lib/storage";
 * await storageManager.initializeAccountSession(accountName, symmetricKey);
 *
 * // Specific adapters:
 * import { IndexedDBAdapter, localStorageAdapter } from "@/lib/storage";
 *
 * // Repositories:
 * import { AccountRepository, NotesRepository } from "@/lib/storage";
 *
 * // Services:
 * import { KDF, EncryptionService } from "@/lib/storage";
 *
 * // Types:
 * import type { Note, IStorageAdapter } from "@/lib/storage";
 */
