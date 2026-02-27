/**
 * createShinobiCashClient — Base client factory.
 *
 * Base client provides discovery and chain utilities.
 * Extend with action extensions for deposits, withdrawals, etc.
 */

import {
  POOL_CHAIN,
  SHINOBI_CASH_ETH_POOL,
  PoolScopeAbi,
} from "@shinobi-cash/constants";
import {
  NoteDiscovery,
  getSpendableNotes as coreGetSpendableNotes,
  type NoteTree,
  type DiscoveryResult,
  type DiscoveryOptions,
  type SpendableNote,
  type ActivityItem,
} from "@shinobi-cash/core/discovery";
import { isSpendableNote } from "@shinobi-cash/core/discovery";
import type { PublicClient } from "viem";
import type {
  ShinobiCashClientConfig,
  BaseShinobiCashClient,
  ClientContext,
} from "./types.js";
import { createDefaultPublicClients } from "./defaults.js";

import type { StorageLayer } from "@shinobi-cash/core/discovery";

const NO_OP_STORAGE: StorageLayer = {
  read: async () => null,
  write: async () => {},
};

function resolveStorage(config: ShinobiCashClientConfig): StorageLayer {
  if (config.storage) return config.storage;
  if (config.cachedState) {
    const cached = config.cachedState;
    return { read: async () => cached, write: async () => {} };
  }
  return NO_OP_STORAGE;
}

export function createShinobiCashClient(config: ShinobiCashClientConfig): BaseShinobiCashClient {
  const { account, indexer, publicClients: publicClientOverrides, ipfsGateways } = config;
  const storage = resolveStorage(config);
  const poolAddress = SHINOBI_CASH_ETH_POOL.address as `0x${string}`;
  const publicClients = { ...createDefaultPublicClients(), ...publicClientOverrides } as Record<number, PublicClient>;

  function requirePublicClient(chainId: number): PublicClient {
    const publicClient = publicClients[chainId];
    if (!publicClient) {
      throw new Error(`No PublicClient configured for chainId ${chainId}`);
    }
    return publicClient;
  }

  // Discovery state
  let trees: NoteTree[] = [];
  let lastUsedIndexByChain = new Map<string, number>();
  let activities: ActivityItem[] = [];

  const discovery = new NoteDiscovery(indexer.getActivities, storage);

  async function fetchContext() {
    const [poolScope, stateTree, aspRootInfo] = await Promise.all([
      requirePublicClient(POOL_CHAIN.id).readContract({ address: poolAddress, abi: PoolScopeAbi, functionName: "SCOPE" }) as Promise<bigint>,
      indexer.getStateTree(poolAddress),
      indexer.getASPRootInfo(),
    ]);

    if (!aspRootInfo) {
      throw new Error("No ASP root info available from indexer");
    }

    return {
      poolScope,
      stateCommitments: stateTree.leaves.map((l) => BigInt(l.commitment)),
      aspRootCid: aspRootInfo.ipfsCid,
    };
  }

  // Shared context for extensions
  const ctx: ClientContext = {
    account,
    poolAddress,
    ipfsGateways,
    getNextDepositIndex(chainId: number): number {
      const lastUsed = lastUsedIndexByChain.get(chainId.toString()) ?? -1;
      return lastUsed + 1;
    },
    fetchContext,
  };

  return {
    get account() {
      return account;
    },

    get accountId() {
      return account.accountId;
    },

    // Discovery
    async sync(options?: DiscoveryOptions): Promise<DiscoveryResult> {
      const result = await discovery.sync(account.accountId, poolAddress, account, options);
      trees = result.trees;
      lastUsedIndexByChain = result.lastUsedIndexByChain;
      activities = result.activities;
      return result;
    },

    getSpendableNotes(): SpendableNote[] {
      return coreGetSpendableNotes(trees).filter(isSpendableNote);
    },

    getBalance(): bigint {
      return this.getSpendableNotes().reduce((sum, note) => sum + BigInt(note.amount), BigInt(0));
    },

    getActivities(): ActivityItem[] {
      return activities;
    },

    // Chain utilities
    async estimateGas(params: { to: `0x${string}`; data: `0x${string}`; value: bigint; account?: `0x${string}` }, chainId: number): Promise<bigint> {
      const publicClient = requirePublicClient(chainId);
      return publicClient.estimateGas(params);
    },

    async getGasPrice(chainId: number): Promise<bigint> {
      const publicClient = requirePublicClient(chainId);
      return publicClient.getGasPrice();
    },

    async waitForTransaction(txHash: `0x${string}`, chainId: number): Promise<{ status: "success" | "reverted" }> {
      const publicClient = requirePublicClient(chainId);
      return publicClient.waitForTransactionReceipt({ hash: txHash });
    },

    // Extend
    extend<T extends object>(fn: (ctx: ClientContext) => T): BaseShinobiCashClient & T {
      return { ...this, ...fn(ctx) } as BaseShinobiCashClient & T;
    },
  };
}
