/**
 * Session Repository - Session and browser storage operations
 */

import { IBrowserStorageAdapter } from "../adapters/types";
import type { SessionInfo } from "../interfaces/IDataTypes";
import type { WalletAccountId } from "@/utils/authCrypto";

// Session constants - exact match to keyDerivation.ts
const SESSION_KEY = "shinobi_session";
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; //  1h

export class SessionRepository {
  private sessionStorageAdapter: IBrowserStorageAdapter;
  constructor(_sessionStorageAdapter: IBrowserStorageAdapter) {
    this.sessionStorageAdapter = _sessionStorageAdapter;
  }

  /**
   * Store session info - exact implementation from keyDerivation.storeSessionInfo
   */
  async storeSessionInfo(
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
      await this.storeSessionInfo(s.accountId, { credentialId: s.credentialId });
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
}
