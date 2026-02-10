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
  serializeTree,
  deserializeTree,
  type ActivityFetcher,
  type SerializableDiscoveryState,
  type NoteTree,
  type SerializableNoteNode,
  type NullifierInfo,
  type Activity,
  type SerializedActivity,
} from "@shinobi-cash/core/discovery";
import { serializeActivity, deserializeActivity } from "@shinobi-cash/data";
import type { DiscoveryResult, DiscoveryOptions } from "@shinobi-cash/core/discovery";
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
      // Deserialize trees
      const trees = cached.trees.map(deserializeTree);

      // Build per-chain last used indices from trees
      const lastUsedIndexByChain = new Map<string, number>();
      for (const tree of trees) {
        const rootNote = tree.root.note;
        const chainId = rootNote.originChainId;
        const current = lastUsedIndexByChain.get(chainId) ?? -1;
        if (rootNote.depositIndex > current) {
          lastUsedIndexByChain.set(chainId, rootNote.depositIndex);
        }
      }

      // Deserialize activities
      const activities = (cached.activities ?? []).map(deserializeActivity);

      return {
        trees,
        lastUsedIndexByChain,
        activities,
        newNotesFound: 0,
        minOffset: cached.minOffset ?? 0,
      };
    }

    return null;
  }

  /**
   * Store discovered notes
   */
  async storeDiscoveredTrees(
    publicKey: string,
    poolAddress: string,
    trees: NoteTree[],
    minOffset?: number
  ): Promise<void> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error("Session not initialized");
    }

    const serializedTrees = trees.map(serializeTree);
    await this.storeData(publicKey, poolAddress, serializedTrees, minOffset);
  }

  /**
   * Store data internally
   */
  async storeData(
    publicKey: string,
    poolAddress: string,
    trees: SerializableNoteNode[],
    minOffset?: number,
    nullifierMap?: Array<{ hash: string; info: NullifierInfo }>,
    nextDepositIndex?: Array<{ chainId: string; index: number }>,
    activities?: SerializedActivity[]
  ): Promise<void> {
    const sensitiveData: CachedNoteData = {
      poolAddress,
      publicKey,
      trees,
      lastSyncTime: Date.now(),
      minOffset,
      nullifierMap,
      nextDepositIndex,
      activities,
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

        // Convert stored trees to the expected format with ChainKey
        const trees = cached.trees.map((tree) => {
          const chainKey = makeChainKey(tree.note.originChainId, tree.note.depositIndex);
          return { chainKey, tree };
        });

        return {
          trees,
          nullifierMap: cached.nullifierMap ?? [],
          nextDepositIndex: cached.nextDepositIndex ?? [],
          activities: cached.activities ?? [],
          minOffset: cached.minOffset ?? 0,
          newFilledDepositsFound: 0,
          newPendingDepositsFound: 0,
        };
      },

      saveState: async (pubKey: string, pool: string, state: SerializableDiscoveryState) => {
        // Extract serialized trees from state
        const trees = state.trees.map((t) => t.tree);

        await this.storeData(
          pubKey,
          pool,
          trees,
          state.minOffset,
          state.nullifierMap,
          state.nextDepositIndex,
          state.activities
        );
      },
    });

    // Run sync
    return await engine.sync(publicKey, poolAddress, accountKey, options);
  }
}

export const notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
