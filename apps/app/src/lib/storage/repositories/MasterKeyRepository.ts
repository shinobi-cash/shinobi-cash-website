import { EncryptionService, arrayBufferToBase64, base64ToArrayBuffer } from "../encryption";
import type { WalletAccountId } from "@/lib/auth";
import { type IndexedDBStore, masterKeyStore } from "../adapters/IndexedDBStore";
import type { WrappedMasterKey } from "../interfaces/IDataTypes";

interface DecryptedMasterKey {
  privateKey: string;
}

function isValidDecryptedMasterKey(value: unknown): value is DecryptedMasterKey {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.privateKey === "string" && v.privateKey.startsWith("0x") && v.privateKey.length === 66
  );
}

export class MasterKeyRepository {
  constructor(
    private storageAdapter: IndexedDBStore,
    private encryptionService: EncryptionService
  ) {}

  /**
   * Store wrapped Master Key for a specific auth method.
   * Creates a new encrypted version of the MK wrapped with the provided KEK.
   *
   * @param accountId - Wallet account ID (validated)
   * @param wrappedBy - Auth method ("wallet" or "passkey")
   * @param masterKey - Master Key (privateKey) to wrap
   */
  async storeWrappedKey(
    accountId: WalletAccountId,
    wrappedBy: "wallet" | "passkey",
    masterKey: string
  ): Promise<void> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error(`KEK not initialized for ${wrappedBy} auth`);
    }

    // Encrypt Master Key with the active KEK
    const encrypted = await this.encryptionService.encrypt({ privateKey: masterKey });

    // Storage key: accountId + auth method
    const storageKey = `${accountId}:mk:${wrappedBy}`;

    const wrappedData: WrappedMasterKey = {
      id: storageKey,
      accountId,
      wrappedBy,
      encryptedPrivateKey: arrayBufferToBase64(encrypted.data),
      iv: arrayBufferToBase64(encrypted.iv),
      salt: arrayBufferToBase64(encrypted.salt),
      createdAt: Date.now(),
    };

    await this.storageAdapter.set(wrappedData);
  }

  /**
   * Get wrapped Master Key for a specific auth method.
   * Returns the encrypted MK that can be decrypted with the appropriate KEK.
   *
   * @param accountId - Wallet account ID
   * @param wrappedBy - Auth method ("wallet" or "passkey")
   * @returns Wrapped Master Key or null if not found
   */
  async getWrappedKey(
    accountId: string,
    wrappedBy: "wallet" | "passkey"
  ): Promise<WrappedMasterKey | null> {
    const storageKey = `${accountId}:mk:${wrappedBy}`;
    const result = await this.storageAdapter.get(storageKey);

    if (!result || !isWrappedMasterKey(result)) {
      return null;
    }

    return result;
  }

  /**
   * Unwrap (decrypt) Master Key using the active KEK.
   *
   * @param accountId - Wallet account ID
   * @param wrappedBy - Auth method ("wallet" or "passkey")
   * @returns Decrypted Master Key (privateKey) or null if not found/failed
   */
  async unwrapKey(accountId: string, wrappedBy: "wallet" | "passkey"): Promise<string | null> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error(`KEK not initialized for ${wrappedBy} auth`);
    }

    const wrapped = await this.getWrappedKey(accountId, wrappedBy);
    if (!wrapped) {
      return null;
    }

    try {
      const encrypted = {
        data: base64ToArrayBuffer(wrapped.encryptedPrivateKey),
        iv: base64ToArrayBuffer(wrapped.iv),
        salt: base64ToArrayBuffer(wrapped.salt),
      };

      const decrypted = await this.encryptionService.decrypt<unknown>(encrypted);

      if (!isValidDecryptedMasterKey(decrypted)) {
        return null;
      }

      return decrypted.privateKey;
    } catch {
      return null;
    }
  }

  /**
   * Delete wrapped Master Key for a specific auth method.
   */
  async deleteWrappedKey(
    accountId: WalletAccountId,
    wrappedBy: "wallet" | "passkey"
  ): Promise<void> {
    const storageKey = `${accountId}:mk:${wrappedBy}`;
    await this.storageAdapter.remove(storageKey);
  }
}

/**
 * Type guard for WrappedMasterKey
 */
function isWrappedMasterKey(value: unknown): value is WrappedMasterKey {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.accountId === "string" &&
    (v.wrappedBy === "wallet" || v.wrappedBy === "passkey") &&
    typeof v.encryptedPrivateKey === "string" &&
    typeof v.iv === "string" &&
    typeof v.salt === "string" &&
    typeof v.createdAt === "number"
  );
}

export const masterKeyRepo = new MasterKeyRepository(
  masterKeyStore,
  masterKeyStore.getEncryptionService()
);
