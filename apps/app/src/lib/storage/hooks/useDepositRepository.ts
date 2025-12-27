/**
 * Hook for accessing DepositRepository
 */

import { useMemo } from "react";
import { DepositRepository } from "../repositories/DepositRepository";
import { notesStorageAdapter, sharedEncryptionService } from "../adapters/IndexedDBAdapter";
import { NotesRepository } from "../repositories/NotesRepository";

/**
 * Hook that provides access to DepositRepository
 * Creates repository instances with proper dependencies
 */
export function useDepositRepository(): DepositRepository {
  return useMemo(() => {
    const notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
    return new DepositRepository(notesRepo);
  }, []);
}
