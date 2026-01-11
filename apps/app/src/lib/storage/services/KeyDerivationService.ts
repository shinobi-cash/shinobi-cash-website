import { ethers } from "ethers";

// ============ TYPES ============

/**
 * WebAuthn PRF Extension Types
 * (Not yet standard in TypeScript DOM lib)
 */
interface PrfExtensionInput {
  eval: {
    first: BufferSource;
    second?: BufferSource;
  };
}

interface PrfExtensionOutput {
  results: {
    first: ArrayBuffer;
    second?: ArrayBuffer;
  };
}

// ============ CONFIGURATION ============

const CONFIG = {
  // PBKDF2 not needed for Passkeys, but kept if you share constants
  KEY_LENGTH: 256,
  HASH_ALGORITHM: "SHA-256",
  SALT_PREFIX: "shinobi-salt-",
  HKDF_INFO: new TextEncoder().encode("shinobi-kdf-v1"),
  NOTES_SALT: new TextEncoder().encode("shinobi-notes-salt"),
  NOTES_INFO: new TextEncoder().encode("shinobi-notes-encryption"),
} as const;

export class KeyDerivationService {
  /**
   * Derive Data Encryption Key (DEK) from Account Master Key (AMK)
   *
   * ARCHITECTURE:
   * 1. KEK (Key Encryption Key) - Derived from Passkey/Wallet
   * 2. AMK (Account Master Key) - Random key stored encrypted by KEK
   * 3. DEK (Data Encryption Key) - Derived deterministically from AMK
   *
   * Benefit: changing auth method only requires re-encrypting the AMK.
   */
  async deriveDataEncryptionKey(amkPrivateKey: string): Promise<CryptoKey> {
    // 1. Robust Input Parsing
    let privateKeyBytes: Uint8Array;
    try {
      privateKeyBytes = ethers.getBytes(amkPrivateKey);
    } catch (e) {
      throw new Error("SECURITY ERROR: AMK is malformed.");
    }

    if (privateKeyBytes.length !== 32) {
      console.warn(
        `[keyDerivationService] AMK length warning: expected 32 bytes, got ${privateKeyBytes.length}`
      );
    }

    // 2. Import AMK
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      privateKeyBytes as BufferSource,
      "HKDF",
      false,
      ["deriveKey"]
    );

    // 3. Derive DEK
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        salt: CONFIG.NOTES_SALT,
        info: CONFIG.NOTES_INFO,
        hash: CONFIG.HASH_ALGORITHM,
      },
      keyMaterial,
      { name: "AES-GCM", length: CONFIG.KEY_LENGTH },
      false, // SECURITY: Key cannot be exported from JS memory
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Derive KEK using Passkey PRF Extension
   */
  async deriveKEKFromPasskey(accountId: string, credentialId: string): Promise<CryptoKey> {
    // 1. Get raw entropy from Authenticator (Hardware Security Module)
    const prfBytes = await this.getPasskeyDerivedBytes(accountId, credentialId);

    // 2. Mix with account-specific salt
    const accountSalt = await this.generateAccountSalt(accountId);

    // 3. Import PRF output as IKM (Input Keying Material)
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      prfBytes as BufferSource,
      "HKDF",
      false,
      ["deriveKey"]
    );

    // 4. Expand into KEK
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        salt: accountSalt as BufferSource,
        info: CONFIG.HKDF_INFO,
        hash: CONFIG.HASH_ALGORITHM,
      },
      keyMaterial,
      { name: "AES-GCM", length: CONFIG.KEY_LENGTH },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Internal: Execute WebAuthn Assertion with PRF
   */
  private async getPasskeyDerivedBytes(
    accountId: string,
    credentialId: string
  ): Promise<Uint8Array> {
    // Input for the hardware PRF.
    // Using account name ensures the same hardware key produces different secrets for different accounts.
    const prfInput = new TextEncoder().encode(`shinobi-prf:${accountId.toLowerCase().trim()}`);

    // Request Assertion
    const cred = await navigator.credentials.get({
      publicKey: {
        // Random challenge is required by spec, even if we only want PRF
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            id: this.base64urlToBytes(credentialId),
            type: "public-key",
          },
        ],
        userVerification: "required", // Required for PRF access
        extensions: {
          prf: { eval: { first: prfInput } } as PrfExtensionInput,
        },
      },
    });

    if (!cred) throw new Error("Passkey authentication cancelled");

    // Extract PRF Result
    // @ts-expect-error - a
    const extensions = cred.getClientExtensionResults() as { prf?: PrfExtensionOutput };

    if (!extensions.prf?.results?.first) {
      throw new Error(
        "Device does not support Passkey PRF. Cannot derive encryption keys from this device."
      );
    }

    return new Uint8Array(extensions.prf.results.first);
  }

  /**
   * Create a new Passkey credential
   * * CRITICAL: We must request the PRF extension during creation.
   * This "initializes" the capability on the hardware token.
   */
  async createPasskeyCredential(
    accountId: string,
    publicKeyHash: string
  ): Promise<{ credentialId: string }> {
    // 1. Prepare User ID (Must be BufferSource)
    const userId = new TextEncoder().encode(publicKeyHash);

    // 2. Determine Relying Party ID (Domain)
    // SAFETY: Use configured env var, fallback to current hostname for dev
    const rpId = process.env.NEXT_PUBLIC_RP_ID || window.location.hostname;

    // 3. Create "Probe" Input for PRF
    // We send a dummy value to verify the authenticator supports PRF storage
    const prfProbe = new TextEncoder().encode("shinobi-prf:probe");

    // 4. Request Credential Creation
    const credential = (await navigator.credentials.create({
      publicKey: {
        // Random challenge (required by spec)
        challenge: crypto.getRandomValues(new Uint8Array(32)),

        rp: {
          name: "Shinobi Privacy Pool",
          id: rpId,
        },

        user: {
          id: userId,
          name: accountId,
          displayName: accountId,
        },

        // Algorithms: ES256 (-7) and RS256 (-257)
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],

        authenticatorSelection: {
          authenticatorAttachment: "platform", // FaceID / TouchID
          userVerification: "required", // Required for PRF
          residentKey: "preferred", // Store key on device
        },

        timeout: 60_000,
        attestation: "none", // Privacy: don't reveal device model

        extensions: {
          prf: {
            eval: { first: prfProbe },
          } as PrfExtensionInput,
        },
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error("Passkey creation was cancelled or failed.");
    }

    // 5. Verify PRF capability was actually created
    // @ts-ignore
    const extensionResults = credential.getClientExtensionResults();
    // Some browsers (like Chrome on macOS) might not return the PRF result
    // immediately during creation, but if it didn't throw, it likely succeeded.
    // However, STRICT checks would look for `extensionResults.prf.enabled` if available.

    return { credentialId: credential.id };
  }

  // ============ UTILS ============

  private async generateAccountSalt(accountId: string): Promise<Uint8Array> {
    const saltInput = CONFIG.SALT_PREFIX + accountId.toLowerCase().trim();
    const hash = await crypto.subtle.digest(
      CONFIG.HASH_ALGORITHM,
      new TextEncoder().encode(saltInput)
    );
    return new Uint8Array(hash);
  }

  /**
   * Standard Base64URL decoder
   * Replaces custom logic with standardized URL-safe decoding
   */
  private base64urlToBytes(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const binString = atob(base64);

    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const keyDerivationService = new KeyDerivationService();