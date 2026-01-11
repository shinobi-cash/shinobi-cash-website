/**
 * Wrapped AMK Repository
 * Handles envelope encryption: AMK encrypted with multiple KEKs
 *
 * Invariant: KEKs NEVER encrypt account data directly.
 * KEKs ONLY encrypt the AMK (privateKey).
 * Each auth method stores its own wrapped version of the AMK.
 */

import { EncryptionService } from "@shinobi-cash/core";
import type { IndexedDBStore } from "../adapters/IndexedDBStore";
import type { WrappedAMK } from "../interfaces/IDataTypes";
import type { WalletAccountId } from "@/features/auth/utils";

export class WrappedAMKRepository {
  constructor(
    private storageAdapter: IndexedDBStore,
    private encryptionService: EncryptionService
  ) {}

  /**
   * Store wrapped AMK for a specific auth method
   * Creates a new encrypted version of the AMK wrapped with the provided KEK
   *
   * @param accountId - Wallet account ID (validated)
   * @param wrappedBy - Auth method ("wallet" or "passkey")
   * @param amk - Account Master Key (privateKey) to wrap
   */
  async storeWrappedAMK(
    accountId: WalletAccountId,
    wrappedBy: "wallet" | "passkey",
    amk: string
  ): Promise<void> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error(`KEK not initialized for ${wrappedBy} auth`);
    }

    // Encrypt AMK with the active KEK
    const encrypted = await this.encryptionService.encrypt({ privateKey: amk });

    // Storage key: accountId + auth method
    const storageKey = `${accountId}:amk:${wrappedBy}`;

    const wrappedData: WrappedAMK = {
      id: storageKey, // Include id for keyPath
      accountId,
      wrappedBy,
      encryptedPrivateKey: this.encryptionService.arrayBufferToBase64(encrypted.data),
      iv: this.encryptionService.arrayBufferToBase64(encrypted.iv),
      salt: this.encryptionService.arrayBufferToBase64(encrypted.salt),
      createdAt: Date.now(),
    };

    await this.storageAdapter.set(wrappedData);
  }

  /**
   * Get wrapped AMK for a specific auth method
   * Returns the encrypted AMK that can be decrypted with the appropriate KEK
   *
   * @param accountId - Wallet account ID
   * @param wrappedBy - Auth method ("wallet" or "passkey")
   * @returns Wrapped AMK or null if not found
   */
  async getWrappedAMK(
    accountId: string,
    wrappedBy: "wallet" | "passkey"
  ): Promise<WrappedAMK | null> {
    const storageKey = `${accountId}:amk:${wrappedBy}`;
    const result = await this.storageAdapter.get(storageKey);

    if (!result || !isWrappedAMK(result)) {
      return null;
    }

    return result;
  }

  /**
   * Unwrap (decrypt) AMK using the active KEK
   *
   * @param accountId - Wallet account ID
   * @param wrappedBy - Auth method ("wallet" or "passkey")
   * @returns Decrypted AMK (privateKey) or null if not found/failed
   */
  async unwrapAMK(accountId: string, wrappedBy: "wallet" | "passkey"): Promise<string | null> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error(`KEK not initialized for ${wrappedBy} auth`);
    }

    const wrapped = await this.getWrappedAMK(accountId, wrappedBy);
    if (!wrapped) {
      return null;
    }

    try {
      const encrypted = {
        data: this.encryptionService.base64ToArrayBuffer(wrapped.encryptedPrivateKey),
        iv: this.encryptionService.base64ToArrayBuffer(wrapped.iv),
        salt: this.encryptionService.base64ToArrayBuffer(wrapped.salt),
      };

      const decrypted = await this.encryptionService.decrypt<{ privateKey: string }>(encrypted);
      return decrypted.privateKey;
    } catch (error) {
      console.error(`Failed to unwrap AMK for ${wrappedBy}:`, error);
      return null;
    }
  }

  /**
   * Delete wrapped AMK for a specific auth method
   */
  async deleteWrappedAMK(accountId: WalletAccountId, wrappedBy: "wallet" | "passkey"): Promise<void> {
    const storageKey = `${accountId}:amk:${wrappedBy}`;
    await this.storageAdapter.remove(storageKey);
  }
}

/**
 * Type guard for WrappedAMK
 */
function isWrappedAMK(value: unknown): value is WrappedAMK {
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
