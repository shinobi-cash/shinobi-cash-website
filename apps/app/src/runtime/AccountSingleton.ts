/**
 * AccountSingleton — Module-level singleton for ShinobiAccount.
 *
 * Created at auth time (onAuthenticated), destroyed on logout.
 * All SDK operations go through getShinobiAccount().
 */

import { createShinobiAccount, type ShinobiAccount } from "@shinobi-cash/core/account";

let account: ShinobiAccount | null = null;

export function getShinobiAccount(): ShinobiAccount {
  if (!account) throw new Error("ShinobiAccount not initialized");
  return account;
}

export function createAccount(privateKey: string): ShinobiAccount {
  account = createShinobiAccount({
    credential: { type: "privateKey", privateKey },
  });
  return account;
}

export function destroyAccount(): void {
  account = null;
}
