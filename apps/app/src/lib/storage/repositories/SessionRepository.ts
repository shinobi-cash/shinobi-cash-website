import { sessionStorageAdapter } from "../adapters/SessionStorageAdapter";
import type { SessionInfo } from "../interfaces/IDataTypes";
import type { WalletAccountId } from "@shinobi-cash/core/auth";
import { Errors, logError } from "@/lib/errors/errors";

const SESSION_KEY = "shinobi_session";
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1h

export async function storeSessionInfo(
  accountId: WalletAccountId,
  opts?: { credentialId?: string }
): Promise<void> {
  const isIframe = window.self !== window.top;
  const sessionInfo: SessionInfo = {
    accountId,
    credentialId: opts?.credentialId,
    lastAuthTime: Date.now(),
    environment: isIframe ? "iframe" : "native",
  };

  await sessionStorageAdapter.set(SESSION_KEY, sessionInfo);
}

export async function getStoredSessionInfo(): Promise<SessionInfo | null> {
  const info = (await sessionStorageAdapter.get(SESSION_KEY)) as SessionInfo | null;
  if (!info) return null;

  if (Date.now() - info.lastAuthTime > SESSION_TIMEOUT_MS) {
    await clearSessionInfo();
    return null;
  }

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

export async function updateSessionLastAuth(): Promise<void> {
  const s = await getStoredSessionInfo();
  if (s) {
    await storeSessionInfo(s.accountId, { credentialId: s.credentialId });
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
    lastAuthTime: Date.now(),
  };

  await sessionStorageAdapter.set(SESSION_KEY, updatedSession);
}

export async function removePasskeyFromSession(): Promise<void> {
  const existingSession = await getStoredSessionInfo();
  if (!existingSession) return;

  const updatedSession: SessionInfo = {
    ...existingSession,
    credentialId: undefined,
    lastAuthTime: Date.now(),
  };

  await sessionStorageAdapter.set(SESSION_KEY, updatedSession);
}
