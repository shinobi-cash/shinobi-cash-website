/**
 * Account Index Service
 * Lists account metadata without requiring authentication
 */

import { storageManager } from "@/lib/storage";
import type { AccountIndex } from "../domain/types";

/**
 * List all account indexes (unencrypted account metadata)
 * Safe to call before session initialization
 *
 * @returns Array of AccountIndex entries for pre-auth discovery
 */
export async function listAccountIndexes(): Promise<AccountIndex[]> {
  // Get AccountMetadata from storage (will be renamed to AccountIndex in Phase 4)
  const metadata = await storageManager.listAccountMetadata();

  // Map to AccountIndex type (same structure, clearer semantics)
  return metadata.map((m) => ({
    id: m.id,
    type: m.type,
    publicKeyHash: m.publicKeyHash,
    createdAt: m.createdAt,
  }));
}

/**
 * Check if any accounts exist
 * Useful for quick checks without fetching full list
 *
 * @returns true if at least one account exists
 */
export async function hasAccounts(): Promise<boolean> {
  const accounts = await listAccountIndexes();
  return accounts.length > 0;
}

/**
 * Get account index by ID
 *
 * @param accountId - Account identifier
 * @returns AccountIndex if found, null otherwise
 */
export async function getAccountIndexById(accountId: string): Promise<AccountIndex | null> {
  const accounts = await listAccountIndexes();
  return accounts.find((acc) => acc.id === accountId) || null;
}
