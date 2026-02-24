import { Bytes, Hex, WebAuthnP256 } from "ox";
import { Errors } from "@/lib/errors/errors";

interface PrfExtensionOutput {
  results: {
    first: ArrayBuffer;
    second?: ArrayBuffer;
  };
}

const CONFIG = {
  KEY_LENGTH: 256,
  HASH_ALGORITHM: "SHA-256",
  SALT_PREFIX: "shinobi-salt-",
  HKDF_INFO: new TextEncoder().encode("shinobi-kdf-v1"),
  NOTES_SALT: new TextEncoder().encode("shinobi-notes-salt"),
  NOTES_INFO: new TextEncoder().encode("shinobi-notes-encryption"),
} as const;

export class KeyDerivationService {
  async deriveDataEncryptionKey(amkPrivateKey: string): Promise<CryptoKey> {
    let privateKeyBytes: Uint8Array;
    try {
      const hexKey = amkPrivateKey.startsWith("0x") ? amkPrivateKey : `0x${amkPrivateKey}`;
      privateKeyBytes = Bytes.fromHex(hexKey as `0x${string}`);
    } catch {
      throw Errors.auth.decryptionFailed("Account key is malformed");
    }

    if (privateKeyBytes.length !== 32) {
      throw Errors.auth.decryptionFailed("Account key has unexpected length");
    }

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      privateKeyBytes as BufferSource,
      "HKDF",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        salt: CONFIG.NOTES_SALT,
        info: CONFIG.NOTES_INFO,
        hash: CONFIG.HASH_ALGORITHM,
      },
      keyMaterial,
      { name: "AES-GCM", length: CONFIG.KEY_LENGTH },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async deriveKEKFromPasskey(accountId: string, credentialId: string): Promise<CryptoKey> {
    const prfBytes = await this.getPasskeyDerivedBytes(accountId, credentialId);
    const accountSalt = await this.generateAccountSalt(accountId);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      prfBytes as BufferSource,
      "HKDF",
      false,
      ["deriveKey"]
    );

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

  private async getPasskeyDerivedBytes(
    accountId: string,
    credentialId: string
  ): Promise<Uint8Array> {
    const prfInput = new TextEncoder().encode(`shinobi-prf:${accountId.toLowerCase().trim()}`);
    const challenge = Hex.fromBytes(crypto.getRandomValues(new Uint8Array(32)));

    // Use WebAuthnP256.sign to evaluate PRF during authentication
    const result = await WebAuthnP256.sign({
      credentialId,
      challenge,
      userVerification: "required",
      extensions: { prf: { eval: { first: prfInput } } },
    });

    const extensions = result.raw.getClientExtensionResults() as { prf?: PrfExtensionOutput };

    if (!extensions.prf?.results?.first) {
      throw Errors.auth.passkeyUnsupported();
    }

    return new Uint8Array(extensions.prf.results.first);
  }

  async createPasskeyCredential(
    accountId: string,
    publicKeyHash: string
  ): Promise<{ credentialId: string }> {
    const userId = new TextEncoder().encode(publicKeyHash);
    const rpId = process.env.NEXT_PUBLIC_RP_ID || window.location.hostname;
    const prfProbe = new TextEncoder().encode("shinobi-prf:probe");

    const credential = await WebAuthnP256.createCredential({
      name: accountId,
      rp: { name: "Shinobi Privacy Pool", id: rpId },
      user: { id: userId, name: accountId, displayName: accountId },
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      challenge: Hex.fromBytes(crypto.getRandomValues(new Uint8Array(32))),
      attestation: "none",
      extensions: { prf: { eval: { first: prfProbe } } },
    });

    return { credentialId: credential.id };
  }

  private async generateAccountSalt(accountId: string): Promise<Uint8Array> {
    const saltInput = CONFIG.SALT_PREFIX + accountId.toLowerCase().trim();
    const hash = await crypto.subtle.digest(
      CONFIG.HASH_ALGORITHM,
      new TextEncoder().encode(saltInput)
    );
    return new Uint8Array(hash);
  }
}

export const keyDerivationService = new KeyDerivationService();
