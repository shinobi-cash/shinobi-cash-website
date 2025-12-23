/**
 * Notes Repository - Domain-specific note storage operations
 * Maintains exact logic and data compatibility with current noteCache implementation
 */

import type { IndexedDBAdapter } from "../adapters/IndexedDBAdapter";
import type {
  CachedNoteData,
  DiscoveryResult,
  EncryptedData,
  NoteChain,
  StoredEncryptedData,
} from "../interfaces/IDataTypes";
import type { EncryptionService } from "../services/EncryptionService";

export class NotesRepository {
  constructor(
    private storageAdapter: IndexedDBAdapter,
    private encryptionService: EncryptionService
  ) {}

  /**
   * Generate storage key - exact implementation from noteCache
   */
  private async getKey(publicKey: string, poolAddress: string): Promise<string> {
    const publicKeyHash = await this.encryptionService.createHash(publicKey);
    const poolAddressHash = await this.encryptionService.createHash(poolAddress);
    return `${publicKeyHash}_${poolAddressHash}`;
  }

  /**
   * Get cached notes - exact implementation from noteCache.getCachedNotes
   */
  async getCachedNotes(publicKey: string, poolAddress: string): Promise<DiscoveryResult | null> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error("Session not initialized");
    }

    const cached = await this.getCachedData(publicKey, poolAddress);

    if (cached) {
      return {
        notes: cached.notes,
        lastUsedIndex: cached.lastUsedDepositIndex,
        newNotesFound: 0,
        lastProcessedCursor: cached.lastProcessedCursor,
      };
    }

    return null;
  }

  /**
   * Store discovered notes - exact implementation from noteCache.storeDiscoveredNotes
   */
  async storeDiscoveredNotes(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[],
    lastProcessedCursor?: string
  ): Promise<void> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error("Session not initialized");
    }

    const lastUsedIndex =
      notes.length > 0 ? Math.max(...notes.map((chain) => chain[0].depositIndex)) : -1;
    await this.storeData(publicKey, poolAddress, notes, lastUsedIndex, lastProcessedCursor);
  }

  /**
   * Get next deposit index - exact implementation from noteCache.getNextDepositIndex
   */
  async getNextDepositIndex(publicKey: string, poolAddress: string): Promise<number> {
    const cached = await this.getCachedData(publicKey, poolAddress);
    return cached ? cached.lastUsedDepositIndex + 1 : 0;
  }

  /**
   * Update last used deposit index - exact implementation from noteCache.updateLastUsedDepositIndex
   */
  async updateLastUsedDepositIndex(
    publicKey: string,
    poolAddress: string,
    depositIndex: number
  ): Promise<void> {
    const cached = await this.getCachedData(publicKey, poolAddress);

    const notes = cached ? cached.notes : [];
    const lastUsedIndex = cached
      ? Math.max(cached.lastUsedDepositIndex, depositIndex)
      : depositIndex;
    const lastProcessedCursor = cached ? cached.lastProcessedCursor : undefined;

    await this.storeData(publicKey, poolAddress, notes, lastUsedIndex, lastProcessedCursor);
  }

  /**
   * Store data internally - exact implementation from noteCache.storeData
   */
  async storeData(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[],
    lastUsedDepositIndex: number,
    lastProcessedCursor?: string
  ): Promise<void> {
    const sensitiveData: CachedNoteData = {
      poolAddress,
      publicKey,
      notes,
      lastUsedDepositIndex,
      lastSyncTime: Date.now(),
      lastProcessedCursor,
    };

    const encrypted = await this.encryptionService.encrypt(sensitiveData);

    const storageData: StoredEncryptedData = {
      id: await this.getKey(publicKey, poolAddress),
      publicKeyHash: await this.encryptionService.createHash(publicKey),
      poolAddressHash: await this.encryptionService.createHash(poolAddress),
      encryptedPayload: {
        iv: this.encryptionService.arrayBufferToBase64(encrypted.iv),
        data: this.encryptionService.arrayBufferToBase64(encrypted.data),
        salt: this.encryptionService.arrayBufferToBase64(encrypted.salt),
      },
      lastSyncTime: sensitiveData.lastSyncTime,
    };

    await this.storageAdapter.set(storageData);
  }

  /**
   * Get cached data internally - exact implementation from noteCache.getCachedData
   */
  private async getCachedData(
    publicKey: string,
    poolAddress: string
  ): Promise<CachedNoteData | null> {
    const key = await this.getKey(publicKey, poolAddress);
    const result = (await this.storageAdapter.get(key)) as StoredEncryptedData | null;

    if (result) {
      const encryptedData: EncryptedData = {
        iv: this.encryptionService.base64ToArrayBuffer(result.encryptedPayload.iv),
        data: this.encryptionService.base64ToArrayBuffer(result.encryptedPayload.data),
        salt: this.encryptionService.base64ToArrayBuffer(result.encryptedPayload.salt),
      };

      try {
        const decryptedData = await this.encryptionService.decrypt<CachedNoteData>(encryptedData);
        return decryptedData;
      } catch (decryptionError) {
        console.error("Failed to decrypt cached data:", decryptionError);
        return null; // Return null if decryption fails (wrong password)
      }
    }

    return null;
  }
}
