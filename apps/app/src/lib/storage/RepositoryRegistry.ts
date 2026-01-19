import { sessionStorageAdapter } from "./adapters/SessionStorageAdapter";
import {
  accountStorageAdapter,
  notesStorageAdapter,
  AMKStorageAdapter,
  sharedEncryptionService,
} from "./adapters/IndexedDBStore";
import { AccountRepository } from "./repositories/AccountRepository";
import { NotesRepository } from "./repositories/NotesRepository";
import { SessionRepository } from "./repositories/SessionRepository";
import { WrappedAMKRepository } from "./repositories/WrappedAMKRepository";

export const notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
export const accountRepo = new AccountRepository(accountStorageAdapter);
export const sessionRepo = new SessionRepository(sessionStorageAdapter);
export const wrappedAMKRepo = new WrappedAMKRepository(
  AMKStorageAdapter,
  AMKStorageAdapter.getEncryptionService()
);
