/**
 * file: shinobi-cash-website/apps/app/src/lib/storage/RepositoryRegistry.ts
 * RepositoryRegistry
 */

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

class RepositoryRegistry {
  /**
   * Exposes NotesRepository.
   * Discovery logic is intentionally NOT proxied here
   * to keep NoteSyncEngine worker-compatible.
   */
  public readonly notesRepo: NotesRepository;

  public readonly accountRepo: AccountRepository;

  public readonly wrappedAMK: WrappedAMKRepository;

  public readonly sessionRepo: SessionRepository;

  constructor() {
    this.notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
    this.accountRepo = new AccountRepository(accountStorageAdapter);
    this.sessionRepo = new SessionRepository(sessionStorageAdapter);
    this.wrappedAMK = new WrappedAMKRepository(
      AMKStorageAdapter,
      AMKStorageAdapter.getEncryptionService()
    );
  }
}

// Export singleton instance
export const repositoryRegistry = new RepositoryRegistry();
