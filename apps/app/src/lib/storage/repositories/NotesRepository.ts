/**
 * NotesRepository
 * NOTE:
 * This module is designed to be Web Worker compatible.
 * Do not introduce direct storage or DOM dependencies.
 */

import {
  EncryptionService,
  type CachedNoteData,
  type DiscoveryResult,
  type DiscoveryOptions,
  type EncryptedData,
  type NoteChain,
  NoteSyncEngine,
  type ActivityFetcher,
  type DiscoveryState,
} from "@shinobi-cash/core";
import type { IndexedDBStore } from "../adapters/IndexedDBStore";
import type { EncryptedNotesData } from "../interfaces/IDataTypes";

export class NotesRepository {
  constructor(
    private storageAdapter: IndexedDBStore,
    private encryptionService: EncryptionService
  ) {}

  /**
   * Generate storage key
   */
  private async getKey(publicKey: string, poolAddress: string): Promise<string> {
    const publicKeyHash = await EncryptionService.createHash(publicKey);
    const poolAddressHash = await EncryptionService.createHash(poolAddress);
    const key = `${publicKeyHash}_${poolAddressHash}`;
    return key;
  }

  /**
   * Get cached notes
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
   * Store discovered notes
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
   * Store data internally
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

    const storageData: EncryptedNotesData = {
      id: await this.getKey(publicKey, poolAddress),
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
   * Get cached data internally
   */
  private async getCachedData(
    publicKey: string,
    poolAddress: string
  ): Promise<CachedNoteData | null> {
    const key = await this.getKey(publicKey, poolAddress);
    const result = (await this.storageAdapter.get(key)) as EncryptedNotesData | null;

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
        console.error("[NotesRepository] ❌ Failed to decrypt cached notes:", decryptionError);
        console.error(
          "[NotesRepository] This likely means notes were encrypted with a different KEK"
        );
        return null; // Return null if decryption fails (wrong password)
      }
    }

    return null;
  }

  /**
   * Discover notes using NoteSyncEngine
   *
   * Clean stateful architecture with pure state transitions.
   * Engine handles orchestration, primitives handle logic.
   *
   * @param publicKey - User's public key/address
   * @param poolAddress - Pool contract address
   * @param accountKey - Account key for cryptographic derivation
   * @param fetchActivities - Function to fetch activities from indexer
   * @param options - Discovery options (progress callback, abort signal)
   * @returns Discovery result with found notes
   */
  async discoverNotes(
    publicKey: string,
    poolAddress: string,
    accountKey: bigint,
    fetchActivities: ActivityFetcher,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResult> {
    // Create sync engine with persistence callbacks
    const engine = new NoteSyncEngine(fetchActivities, {
      loadState: async (pubKey: string, pool: string) => {
        const cached = await this.getCachedNotes(pubKey, pool);
        if (!cached) return null;

        return {
          notes: cached.notes,
          lastUsedIndex: cached.lastUsedIndex,
          cursor: cached.lastProcessedCursor,
        };
      },

      saveState: async (pubKey: string, pool: string, state: DiscoveryState) => {
        await this.storeDiscoveredNotes(pubKey, pool, state.notes, state.cursor);
      },
    });

    // Run sync
    return await engine.sync(publicKey, poolAddress, accountKey, options);
  }
}
