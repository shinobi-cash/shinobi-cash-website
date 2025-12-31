/**
 * Account Index Service
 * Lists account metadata without requiring authentication
 */

import { storageManager } from "@/lib/storage";
import type { AccountIndex } from "../domain/types";

/**
 * List all account indexes (unencrypted account metadata)
 * Safe to call before session initialization
 */
export async function listAccountIndexes(): Promise<AccountIndex[]> {
  return storageManager.listAccountIndex();
}

/**
 * Check if any accounts exist
 */
export async function hasAccounts(): Promise<boolean> {
  const accounts = await listAccountIndexes();
  return accounts.length > 0;
}

/**
 * Get account index by ID
 */
export async function getAccountIndexById(
  accountId: string
): Promise<AccountIndex | null> {
  const accounts = await listAccountIndexes();
  return accounts.find((acc) => acc.id === accountId) ?? null;
}
