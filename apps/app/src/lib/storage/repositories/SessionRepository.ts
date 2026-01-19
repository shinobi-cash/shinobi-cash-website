import { sessionStorageAdapter } from "../adapters/SessionStorageAdapter";
import type { SessionInfo } from "../interfaces/IDataTypes";
import type { WalletAccountId } from "@/utils/authCrypto";

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

  try {
    await sessionStorageAdapter.set(SESSION_KEY, sessionInfo);
  } catch (e) {
    console.warn("Failed to store session info:", e);
  }
}

export async function getStoredSessionInfo(): Promise<SessionInfo | null> {
  try {
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
  } catch (e) {
    console.warn("Failed to get stored session:", e);
    return null;
  }
}

export async function clearSessionInfo(): Promise<void> {
  try {
    await sessionStorageAdapter.remove(SESSION_KEY);
  } catch (e) {
    console.warn("Failed to clear session info:", e);
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
    console.warn("[SessionRepository] No existing session to add passkey to");
    return;
  }

  const updatedSession: SessionInfo = {
    ...existingSession,
    credentialId,
    lastAuthTime: Date.now(),
  };

  try {
    await sessionStorageAdapter.set(SESSION_KEY, updatedSession);
  } catch (e) {
    console.warn("Failed to add passkey to session:", e);
  }
}

export async function removePasskeyFromSession(): Promise<void> {
  const existingSession = await getStoredSessionInfo();
  if (!existingSession) return;

  const updatedSession: SessionInfo = {
    ...existingSession,
    credentialId: undefined,
    lastAuthTime: Date.now(),
  };

  try {
    await sessionStorageAdapter.set(SESSION_KEY, updatedSession);
  } catch (e) {
    console.warn("Failed to remove passkey from session:", e);
  }
}
