/**
 * Session Repository - Session and browser storage operations
 * Maintains exact logic with current keyDerivation.ts and noteCache session methods
 */

import type { SessionInfo } from "../interfaces/IDataTypes";
import type { IBrowserStorageAdapter } from "../interfaces/IStorageAdapter";

// Session constants - exact match to keyDerivation.ts
const SESSION_KEY = "shinobi_session";
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24h

export class SessionRepository {
  constructor(
    private localStorageAdapter: IBrowserStorageAdapter,
    private sessionStorageAdapter: IBrowserStorageAdapter
  ) {}

  /**
   * Store session info - exact implementation from keyDerivation.storeSessionInfo
   */
  async storeSessionInfo(
    accountName: string,
    authMethod: "passkey" | "wallet",
    opts?: { credentialId?: string }
  ): Promise<void> {
    const isIframe = window.self !== window.top;
    const sessionInfo: SessionInfo = {
      accountName: accountName.trim(),
      authMethod,
      credentialId: opts?.credentialId,
      lastAuthTime: Date.now(),
      environment: isIframe ? "iframe" : "native",
    };

    try {
      await this.sessionStorageAdapter.set(SESSION_KEY, sessionInfo);
    } catch (e) {
      console.warn("Failed to store session info:", e);
    }
  }

  /**
   * Get stored session info - exact implementation from keyDerivation.getStoredSessionInfo
   */
  async getStoredSessionInfo(): Promise<SessionInfo | null> {
    try {
      const info = (await this.sessionStorageAdapter.get(SESSION_KEY)) as SessionInfo | null;
      if (!info) return null;

      // Check timeout
      if (Date.now() - info.lastAuthTime > SESSION_TIMEOUT_MS) {
        await this.clearSessionInfo();
        return null;
      }

      // Check environment
      const isIframe = window.self !== window.top;
      const env = isIframe ? "iframe" : "native";
      if (info.environment !== env) {
        await this.clearSessionInfo();
        return null;
      }

      return info;
    } catch (e) {
      console.warn("Failed to get stored session:", e);
      return null;
    }
  }

  /**
   * Clear session info - exact implementation from keyDerivation.clearSessionInfo
   */
  async clearSessionInfo(): Promise<void> {
    try {
      await this.sessionStorageAdapter.remove(SESSION_KEY);
    } catch (e) {
      console.warn("Failed to clear session info:", e);
    }
  }

  /**
   * Update session last auth time - exact implementation from keyDerivation.updateSessionLastAuth
   */
  async updateSessionLastAuth(): Promise<void> {
    const s = await this.getStoredSessionInfo();
    if (s) {
      await this.storeSessionInfo(s.accountName, s.authMethod, { credentialId: s.credentialId });
    }
  }

  /**
   * Add passkey credential to existing session
   * Preserves the original authMethod (wallet), just adds passkey capability
   *
   * @param credentialId - WebAuthn credential ID
   */
  async addPasskeyToSession(credentialId: string): Promise<void> {
    const existingSession = await this.getStoredSessionInfo();
    if (!existingSession) {
      console.warn("[SessionRepository] No existing session to add passkey to");
      return;
    }

    // Preserve original authMethod, just add passkey credentialId
    const updatedSession: SessionInfo = {
      ...existingSession,
      credentialId,
      lastAuthTime: Date.now(), // Update timestamp
    };

    try {
      await this.sessionStorageAdapter.set(SESSION_KEY, updatedSession);
      console.debug("[SessionRepository] Added passkey credential to existing session", {
        authMethod: updatedSession.authMethod,
        hasCredentialId: !!updatedSession.credentialId,
      });
    } catch (e) {
      console.warn("Failed to add passkey to session:", e);
    }
  }

  /**
   * Remove passkey credential from existing session
   * Keeps the session but removes passkey capability
   */
  async removePasskeyFromSession(): Promise<void> {
    const existingSession = await this.getStoredSessionInfo();
    if (!existingSession) {
      return;
    }

    // Remove credentialId
    const updatedSession: SessionInfo = {
      ...existingSession,
      credentialId: undefined,
      lastAuthTime: Date.now(),
    };

    try {
      await this.sessionStorageAdapter.set(SESSION_KEY, updatedSession);
      console.debug("[SessionRepository] Removed passkey credential from session");
    } catch (e) {
      console.warn("Failed to remove passkey from session:", e);
    }
  }

  /**
   * Store user salt - from keyDerivation.getOrCreateUserSalt logic
   */
  async storeUserSalt(accountName: string, salt: Uint8Array): Promise<void> {
    const key = `shinobi_user_salt:${accountName.toLowerCase().trim()}`;
    const base64Salt = btoa(String.fromCharCode(...salt));
    await this.localStorageAdapter.set(key, base64Salt);
  }

  /**
   * Get user salt - from keyDerivation.getOrCreateUserSalt logic
   */
  async getUserSalt(accountName: string): Promise<Uint8Array | null> {
    const key = `shinobi_user_salt:${accountName.toLowerCase().trim()}`;
    const existing = (await this.localStorageAdapter.get(key)) as string | null;
    if (existing) {
      const bin = atob(existing);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return null;
  }

  /**
   * Create user salt if doesn't exist - from keyDerivation.getOrCreateUserSalt logic
   */
  async getOrCreateUserSalt(accountName: string): Promise<Uint8Array> {
    const existing = await this.getUserSalt(accountName);
    if (existing) return existing;

    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    await this.storeUserSalt(accountName, salt);
    return salt;
  }

  /**
   * Store theme preference - from ThemeContext.tsx
   */
  async storeTheme(theme: string, storageKey = "shinobi.cash.theme"): Promise<void> {
    await this.localStorageAdapter.set(storageKey, theme);
  }

  /**
   * Get theme preference - from ThemeContext.tsx
   */
  async getTheme(storageKey = "shinobi.cash.theme"): Promise<string | null> {
    return this.localStorageAdapter.get(storageKey) as Promise<string | null>;
  }
}
