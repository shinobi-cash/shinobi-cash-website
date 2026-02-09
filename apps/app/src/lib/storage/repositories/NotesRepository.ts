import {
  EncryptionService,
  type EncryptedData,
  createHash,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../encryption";
import {
  NoteDiscovery,
  makeChainKey,
  type ActivityFetcher,
  type SerializableDiscoveryState,
} from "@shinobi-cash/core/discovery";
import type { DiscoveryResult, DiscoveryOptions, NoteChain, NullifierInfo } from "@shinobi-cash/core/discovery";
import {
  type IndexedDBStore,
  notesStorageAdapter,
  sharedEncryptionService,
} from "../adapters/IndexedDBStore";
import type { CachedNoteData, EncryptedNotesData } from "../interfaces/IDataTypes";

export class NotesRepository {
  constructor(
    private storageAdapter: IndexedDBStore,
    private encryptionService: EncryptionService
  ) {}

  /**
   * Generate storage key
   */
  private async getKey(publicKey: string, poolAddress: string): Promise<string> {
    const publicKeyHash = await createHash(publicKey);
    const poolAddressHash = await createHash(poolAddress);
    return `${publicKeyHash}_${poolAddressHash}`;
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
      // Build per-chain last used indices from notes
      const lastUsedIndexByChain = new Map<string, number>();
      for (const chain of cached.notes) {
        const depositNote = chain[0];
        if (depositNote) {
          const chainId = depositNote.originChainId;
          const current = lastUsedIndexByChain.get(chainId) ?? -1;
          if (depositNote.depositIndex > current) {
            lastUsedIndexByChain.set(chainId, depositNote.depositIndex);
          }
        }
      }

      return {
        notes: cached.notes,
        lastUsedIndexByChain,
        newNotesFound: 0,
        minOffset: cached.minOffset ?? 0,
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
    minOffset?: number
  ): Promise<void> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error("Session not initialized");
    }

    await this.storeData(publicKey, poolAddress, notes, minOffset);
  }

  /**
   * Store data internally
   */
  async storeData(
    publicKey: string,
    poolAddress: string,
    notes: NoteChain[],
    minOffset?: number,
    nullifierMap?: Array<{ hash: string; info: NullifierInfo }>,
    nextDepositIndex?: Array<{ chainId: string; index: number }>,
    newDepositsFound?: number
  ): Promise<void> {
    const sensitiveData: CachedNoteData = {
      poolAddress,
      publicKey,
      notes,
      lastSyncTime: Date.now(),
      minOffset,
      nullifierMap,
      nextDepositIndex,
      newDepositsFound,
    };

    const encrypted = await this.encryptionService.encrypt(sensitiveData);

    const storageData: EncryptedNotesData = {
      id: await this.getKey(publicKey, poolAddress),
      encryptedPayload: {
        iv: arrayBufferToBase64(encrypted.iv),
        data: arrayBufferToBase64(encrypted.data),
        salt: arrayBufferToBase64(encrypted.salt),
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
        iv: base64ToArrayBuffer(result.encryptedPayload.iv),
        data: base64ToArrayBuffer(result.encryptedPayload.data),
        salt: base64ToArrayBuffer(result.encryptedPayload.salt),
      };

      try {
        const decryptedData = await this.encryptionService.decrypt<CachedNoteData>(encryptedData);
        return decryptedData;
      } catch {
        // Decryption failed - likely encrypted with a different KEK
        return null;
      }
    }

    return null;
  }

  /**
   * Discover notes using NoteDiscovery
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
    const engine = new NoteDiscovery(fetchActivities, {
      loadState: async (pubKey: string, pool: string): Promise<SerializableDiscoveryState | null> => {
        const cached = await this.getCachedData(pubKey, pool);
        if (!cached) return null;

        // Convert stored notes to chains array format using ChainKey
        const chains = cached.notes.map((chain) => {
          const depositNote = chain[0];
          const chainKey = depositNote
            ? makeChainKey(depositNote.originChainId, depositNote.depositIndex)
            : "0:0";
          return { chainKey, chain };
        });

        return {
          chains,
          nullifierMap: cached.nullifierMap ?? [],
          nextDepositIndex: cached.nextDepositIndex ?? [],
          minOffset: cached.minOffset ?? 0,
          newFilledDepositsFound: 0, // Not persisted in old format, start fresh
          newPendingDepositsFound: 0,
          newDepositsFound: cached.newDepositsFound ?? 0,
        };
      },

      saveState: async (pubKey: string, pool: string, state: SerializableDiscoveryState) => {
        // Convert chains array back to NoteChain[]
        const notes = state.chains.map((c) => c.chain);

        await this.storeData(
          pubKey,
          pool,
          notes,
          state.minOffset,
          state.nullifierMap,
          state.nextDepositIndex,
          state.newDepositsFound
        );
      },
    });

    // Run sync
    return await engine.sync(publicKey, poolAddress, accountKey, options);
  }
}

export const notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
