/**
 * Key Derivation Service
 * Provides cryptographic key derivation with secure storage integration
 */

import { localStorageAdapter, sessionStorageAdapter } from "../adapters/BrowserStorageAdapter";
import type { SessionInfo } from "../interfaces/IDataTypes";
import { SessionRepository } from "../repositories/SessionRepository";

// Configuration - exact match to keyDerivation.ts
const CONFIG = {
  PBKDF2_ITERATIONS: 310_000,
  KEY_LENGTH: 256,
  HASH_ALGORITHM: "SHA-256",
  SALT_PREFIX: "shinobi-salt-",
  HKDF_INFO: new TextEncoder().encode("shinobi-kdf-v1"),
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24h
};

export interface DerivedKeyResult {
  symmetricKey: CryptoKey;
  salt: Uint8Array;
}

export class KeyDerivationService {
  private sessionRepo: SessionRepository;

  constructor() {
    this.sessionRepo = new SessionRepository(localStorageAdapter, sessionStorageAdapter);
  }

  /**
   * Generate account salt - exact implementation from keyDerivation.ts
   */
  private async generateAccountSalt(accountName: string): Promise<Uint8Array> {
    const saltInput = CONFIG.SALT_PREFIX + accountName.toLowerCase().trim();
    const hash = await crypto.subtle.digest(CONFIG.HASH_ALGORITHM, new TextEncoder().encode(saltInput));
    return new Uint8Array(hash);
  }

  /**
   * Build hybrid salt - exact implementation from keyDerivation.ts
   */
  private async buildHybridSalt(accountName: string): Promise<Uint8Array> {
    const accountSalt = await this.generateAccountSalt(accountName);
    const userSalt = await this.sessionRepo.getOrCreateUserSalt(accountName);
    const out = new Uint8Array(accountSalt.length + userSalt.length);
    out.set(accountSalt, 0);
    out.set(userSalt, accountSalt.length);
    return out;
  }

  /**
   * Derive key from password - exact implementation from keyDerivation.ts
   */
  async deriveKeyFromPassword(password: string, accountName: string): Promise<DerivedKeyResult> {
    const salt = await this.buildHybridSalt(accountName);

    const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
      "deriveKey",
    ]);

    const symmetricKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as BufferSource,
        iterations: CONFIG.PBKDF2_ITERATIONS,
        hash: CONFIG.HASH_ALGORITHM,
      },
      keyMaterial,
      { name: "AES-GCM", length: CONFIG.KEY_LENGTH },
      false,
      ["encrypt", "decrypt"],
    );

    return { symmetricKey, salt };
  }

  /**
   * Derive key from passkey - exact implementation from keyDerivation.ts
   */
  async deriveKeyFromPasskey(accountName: string, credentialId: string): Promise<DerivedKeyResult> {
    const prfBytes = await this.getPasskeyDerivedBytes(accountName, credentialId);
    const accountSalt = await this.generateAccountSalt(accountName);

    const keyMaterial = await crypto.subtle.importKey("raw", prfBytes as BufferSource, "HKDF", false, ["deriveKey"]);
    const symmetricKey = await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        salt: accountSalt as BufferSource,
        info: CONFIG.HKDF_INFO,
        hash: CONFIG.HASH_ALGORITHM,
      },
      keyMaterial,
      { name: "AES-GCM", length: CONFIG.KEY_LENGTH },
      false,
      ["encrypt", "decrypt"],
    );

    return { symmetricKey, salt: accountSalt };
  }

  /**
   * Get passkey derived bytes - exact implementation from keyDerivation.ts
   */
  private async getPasskeyDerivedBytes(accountName: string, credentialId: string): Promise<Uint8Array> {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const prfInput = new TextEncoder().encode(`shinobi-prf:${accountName.toLowerCase().trim()}`);

    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: this.base64urlToArrayBuffer(credentialId), type: "public-key" }],
        userVerification: "required",
        timeout: 60_000,
        extensions: {
          prf: { eval: { first: prfInput } },
        },
      },
    })) as PublicKeyCredential | null;

    if (!cred || !cred.response) {
      throw new Error("Passkey authentication failed - no assertion received");
    }

    const extResults = cred.getClientExtensionResults?.() ?? {};
    const prf = extResults?.prf;
    const first: ArrayBuffer | undefined = prf?.results?.first as ArrayBuffer | undefined;

    if (!first || !(first instanceof ArrayBuffer)) {
      throw new Error(
        "Authenticator does not support PRF (hmac-secret) extension; deterministic passkey KDF unavailable.",
      );
    }

    return new Uint8Array(first);
  }

  /**
   * Create passkey credential - exact implementation from keyDerivation.ts
   */
  async createPasskeyCredential(accountName: string, userHandle: string): Promise<{ credentialId: string }> {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = new TextEncoder().encode(userHandle);
    // Safe access to environment variables in browser context
    const rpId = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_RP_ID
      ? process.env.NEXT_PUBLIC_RP_ID
      : window.location.hostname;

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Shinobi Privacy Pool",
          id: rpId,
        },
        user: {
          id: userId,
          name: accountName,
          displayName: accountName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
        extensions: {
          prf: { eval: { first: new TextEncoder().encode("shinobi-prf:probe") } },
        },
      },
    })) as PublicKeyCredential | null;

    if (!credential) throw new Error("Failed to create passkey credential");

    return { credentialId: credential.id };
  }

  /**
   * Resume authentication - exact implementation from keyDerivation.ts
   */
  async resumeAuth(): Promise<
    | { status: "passkey-ready"; result: DerivedKeyResult; accountName: string }
    | { status: "password-needed"; accountName: string }
    | { status: "none" }
  > {
    const session = await this.sessionRepo.getStoredSessionInfo();
    if (!session) return { status: "none" };

    if (session.authMethod === "passkey" && session.credentialId) {
      const result = await this.deriveKeyFromPasskey(session.accountName, session.credentialId);
      await this.sessionRepo.updateSessionLastAuth();
      return { status: "passkey-ready", result, accountName: session.accountName };
    }

    if (session.authMethod === "password") {
      return { status: "password-needed", accountName: session.accountName };
    }

    return { status: "none" };
  }

  /**
   * Store session info - delegates to SessionRepository
   */
  async storeSessionInfo(
    accountName: string,
    authMethod: "passkey" | "password",
    opts?: { credentialId?: string },
  ): Promise<void> {
    return this.sessionRepo.storeSessionInfo(accountName, authMethod, opts);
  }

  /**
   * Get stored session info - delegates to SessionRepository
   */
  async getStoredSessionInfo(): Promise<SessionInfo | null> {
    return this.sessionRepo.getStoredSessionInfo();
  }

  /**
   * Clear session info - delegates to SessionRepository
   */
  async clearSessionInfo(): Promise<void> {
    return this.sessionRepo.clearSessionInfo();
  }

  /**
   * Helper method - exact implementation from keyDerivation.ts
   */
  private base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
}

// Export singleton instance for consistent usage
export const keyDerivationService = new KeyDerivationService();

// Export public API that matches current KDF export from keyDerivation.ts
export const KDF = {
  deriveKeyFromPassword: keyDerivationService.deriveKeyFromPassword.bind(keyDerivationService),
  deriveKeyFromPasskey: keyDerivationService.deriveKeyFromPasskey.bind(keyDerivationService),
  createPasskeyCredential: keyDerivationService.createPasskeyCredential.bind(keyDerivationService),
  storeSessionInfo: keyDerivationService.storeSessionInfo.bind(keyDerivationService),
  getStoredSessionInfo: keyDerivationService.getStoredSessionInfo.bind(keyDerivationService),
  clearSessionInfo: keyDerivationService.clearSessionInfo.bind(keyDerivationService),
  resumeAuth: keyDerivationService.resumeAuth.bind(keyDerivationService),
};
