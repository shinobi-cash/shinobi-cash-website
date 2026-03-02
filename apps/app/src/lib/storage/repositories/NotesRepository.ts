import {
  EncryptionService,
  type EncryptedData,
  createHash,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../encryption";
import {
  makeChainKey,
  serializeTree,
  deserializeTree,
  type StorageLayer,
  type SerializableDiscoveryState,
  type NoteTree,
  type SerializableNoteNode,
  type NullifierInfo,
  type ActivityItem,
} from "@shinobi-cash/core/discovery";
import type { DiscoveryResult } from "@shinobi-cash/core/discovery";
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
  private async getKey(accountId: string, poolAddress: string): Promise<string> {
    const accountIdHash = await createHash(accountId);
    const poolAddressHash = await createHash(poolAddress);
    return `${accountIdHash}_${poolAddressHash}`;
  }

  /**
   * Get cached notes
   */
  async getCachedNotes(accountId: string, poolAddress: string): Promise<DiscoveryResult | null> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error("Session not initialized");
    }

    const cached = await this.getCachedData(accountId, poolAddress);

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

      // Activities are already in correct format (data-v2 uses string values)
      const activities = cached.activities ?? [];

      return {
        trees,
        lastUsedIndexByChain,
        activities,
        newNotesFound: 0,
        lastSyncedOffset: cached.lastSyncedOffset ?? 0,
      };
    }

    return null;
  }

  /**
   * Store discovered notes
   */
  async storeDiscoveredTrees(
    accountId: string,
    poolAddress: string,
    trees: NoteTree[],
    lastSyncedOffset?: number
  ): Promise<void> {
    if (!this.encryptionService.isKeyAvailable()) {
      throw new Error("Session not initialized");
    }

    const serializedTrees = trees.map(serializeTree);
    await this.storeData(accountId, poolAddress, serializedTrees, lastSyncedOffset);
  }

  /**
   * Store data internally
   */
  async storeData(
    accountId: string,
    poolAddress: string,
    trees: SerializableNoteNode[],
    lastSyncedOffset?: number,
    nullifierMap?: Array<{ hash: string; info: NullifierInfo }>,
    nextDepositIndex?: Array<{ chainId: string; index: number }>,
    activities?: ActivityItem[]
  ): Promise<void> {
    const sensitiveData: CachedNoteData = {
      poolAddress,
      accountId,
      trees,
      lastSyncTime: Date.now(),
      lastSyncedOffset,
      nullifierMap,
      nextDepositIndex,
      activities,
    };

    const encrypted = await this.encryptionService.encrypt(sensitiveData);

    const storageData: EncryptedNotesData = {
      id: await this.getKey(accountId, poolAddress),
      encryptedPayload: {
        iv: arrayBufferToBase64(encrypted.iv),
        data: arrayBufferToBase64(encrypted.data),
      },
      lastSyncTime: sensitiveData.lastSyncTime,
    };

    await this.storageAdapter.set(storageData);
  }

  /**
   * Get cached data internally
   */
  private async getCachedData(
    accountId: string,
    poolAddress: string
  ): Promise<CachedNoteData | null> {
    const key = await this.getKey(accountId, poolAddress);
    const result = (await this.storageAdapter.get(key)) as EncryptedNotesData | null;

    if (result) {
      const encryptedData: EncryptedData = {
        iv: base64ToArrayBuffer(result.encryptedPayload.iv),
        data: base64ToArrayBuffer(result.encryptedPayload.data),
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
   * Get persistence callbacks for SDK's createShinobiAccount.
   * Same load/save logic as discoverNotes() but exposed for external use.
   */
  getStorageLayer(): StorageLayer {
    return {
      read: async (pubKey: string, pool: string): Promise<SerializableDiscoveryState | null> => {
        const cached = await this.getCachedData(pubKey, pool);
        if (!cached) return null;

        const trees = cached.trees.map((tree) => {
          const chainKey = makeChainKey(tree.note.originChainId, tree.note.depositIndex);
          return { chainKey, tree };
        });

        return {
          trees,
          nullifierMap: cached.nullifierMap ?? [],
          nextDepositIndex: cached.nextDepositIndex ?? [],
          activities: cached.activities ?? [],
          lastSyncedOffset: cached.lastSyncedOffset ?? 0,
          newFilledDepositsFound: 0,
          newPendingDepositsFound: 0,
        };
      },

      write: async (pubKey: string, pool: string, state: SerializableDiscoveryState) => {
        const trees = state.trees.map((t) => t.tree);

        await this.storeData(
          pubKey,
          pool,
          trees,
          state.lastSyncedOffset,
          state.nullifierMap,
          state.nextDepositIndex,
          state.activities
        );
      },
    };
  }
}

export const notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
