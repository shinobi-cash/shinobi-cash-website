/**
 * Session Repository - Session and browser storage operations
 * Maintains exact logic with current keyDerivation.ts and noteCache session methods
 */

import type { SessionInfo } from "../interfaces/IDataTypes";
import type { IBrowserStorageAdapter } from "../interfaces/IStorageAdapter";

// Session constants - exact match to keyDerivation.ts
const SESSION_KEY = "shinobi_session";
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24h
const STORAGE_KEY = "shinobi.encrypted.session";

export class SessionRepository {
  constructor(
    private localStorageAdapter: IBrowserStorageAdapter,
    private sessionStorageAdapter: IBrowserStorageAdapter,
  ) {}

  /**
   * Store session info - exact implementation from keyDerivation.storeSessionInfo
   */
  async storeSessionInfo(
    accountName: string,
    authMethod: "passkey" | "password",
    opts?: { credentialId?: string },
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
   * Mark session as initialized - exact implementation from noteCache.initializeAccountSession
   */
  async markSessionInitialized(accountName: string): Promise<void> {
    try {
      await this.localStorageAdapter.set(`${STORAGE_KEY}_${accountName}`, "initialized");
    } catch (error) {
      console.warn("Failed to set session marker:", error);
    }
  }

  /**
   * Check if has encrypted data - exact implementation from noteCache.hasEncryptedData
   */
  hasEncryptedData(accountName?: string): boolean {
    try {
      if (accountName) {
        const keys = this.localStorageAdapter.getAllKeys();
        return keys.includes(`${STORAGE_KEY}_${accountName}`);
      }

      // Check for any account session
      const keys = this.localStorageAdapter.getAllKeys();
      return keys.some((key) => key.startsWith(STORAGE_KEY));
    } catch (error) {
      console.warn("Failed to check encrypted data:", error);
      return false;
    }
  }

  /**
   * Clear all session markers - from noteCache.clearAllData
   */
  async clearAllSessionMarkers(): Promise<void> {
    try {
      this.localStorageAdapter.removeByPrefix(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear session markers:", error);
    }
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
