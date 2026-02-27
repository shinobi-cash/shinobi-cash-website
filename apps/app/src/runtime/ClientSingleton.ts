/**
 * ClientSingleton — Module-level singleton for the base ShinobiCashClient.
 *
 * Only creates the base client (discovery + chain utilities).
 * Controllers extend with action extensions as needed for code splitting.
 */

import { createShinobiCashClient, type BaseShinobiCashClient } from "@shinobi-cash/client";
import { createShinobiAccount } from "@shinobi-cash/core/account";
import { createShinobiIndexer } from "@/utils/indexer";
import { notesRepo } from "@/lib/storage/repositories/NotesRepository";

let client: BaseShinobiCashClient | null = null;

export function getShinobiClient(): BaseShinobiCashClient {
  if (!client) throw new Error("ShinobiCashClient not initialized");
  return client;
}

export function createClient(privateKey: string): BaseShinobiCashClient {
  client = createShinobiCashClient({
    account: createShinobiAccount({ credential: { type: "privateKey", privateKey } }),
    indexer: createShinobiIndexer(),
    storage: notesRepo.getStorageLayer(),
  });
  return client;
}

export function destroyClient(): void {
  client = null;
}
