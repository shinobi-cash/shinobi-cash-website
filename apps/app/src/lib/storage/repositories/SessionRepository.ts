import { sessionStorageAdapter } from "../adapters/SessionStorageAdapter";
import type { SessionInfo } from "../interfaces/IDataTypes";
import type { WalletAccountId } from "@/lib/auth";
import { Errors, logError } from "@/lib/errors/errors";

const SESSION_KEY = "shinobi_session";

export async function storeSessionInfo(
  accountId: WalletAccountId,
  opts?: { credentialId?: string }
): Promise<void> {
  const isIframe = window.self !== window.top;
  const sessionInfo: SessionInfo = {
    accountId,
    credentialId: opts?.credentialId,
    environment: isIframe ? "iframe" : "native",
  };

  await sessionStorageAdapter.set(SESSION_KEY, sessionInfo);
}

export async function getStoredSessionInfo(): Promise<SessionInfo | null> {
  const info = (await sessionStorageAdapter.get(SESSION_KEY)) as SessionInfo | null;
  if (!info) return null;

  // Prevent cross-context session reuse (iframe ↔ native)
  const isIframe = window.self !== window.top;
  const env = isIframe ? "iframe" : "native";
  if (info.environment !== env) {
    await clearSessionInfo();
    return null;
  }

  return info;
}

export async function clearSessionInfo(): Promise<void> {
  try {
    await sessionStorageAdapter.remove(SESSION_KEY);
  } catch (error) {
    // Best-effort cleanup - log but don't throw
    logError(error, { action: "clearSessionInfo" });
  }
}

export async function addPasskeyToSession(credentialId: string): Promise<void> {
  const existingSession = await getStoredSessionInfo();
  if (!existingSession) {
    throw Errors.auth.sessionRequired();
  }

  const updatedSession: SessionInfo = {
    ...existingSession,
    credentialId,
  };

  await sessionStorageAdapter.set(SESSION_KEY, updatedSession);
}

export async function removePasskeyFromSession(): Promise<void> {
  const existingSession = await getStoredSessionInfo();
  if (!existingSession) return;

  const updatedSession: SessionInfo = {
    ...existingSession,
    credentialId: undefined,
  };

  await sessionStorageAdapter.set(SESSION_KEY, updatedSession);
}
