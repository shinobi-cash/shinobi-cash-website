import type { StateTreeResponse, StateTreeLeaf, PaginationOptions } from "../types/index.js";

interface StateTreeClientConfig {
  endpoint: string;
  authToken?: string;
  timeout: number;
}

/**
 * Client for /v2/state-tree endpoint
 */
export class StateTreeClient {
  private config: StateTreeClientConfig;

  constructor(config: StateTreeClientConfig) {
    this.config = config;
  }

  /**
   * Fetch a single page of state tree leaves for a pool
   */
  async fetch(
    pool: string,
    pagination?: PaginationOptions,
    fromIndex?: string
  ): Promise<StateTreeResponse> {
    const params = new URLSearchParams();

    params.set("pool", pool);
    if (fromIndex) params.set("fromIndex", fromIndex);
    if (pagination?.limit) params.set("limit", String(pagination.limit));
    if (pagination?.offset) params.set("offset", String(pagination.offset));

    const url = `${this.config.endpoint}/v2/state-tree?${params}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.authToken) {
      headers["Authorization"] = `Bearer ${this.config.authToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`State tree fetch failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as StateTreeResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch all state tree leaves for a pool
   * Returns merkleRoot, treeSize, and all leaves
   */
  async fetchAll(
    pool: string,
    batchSize: number = 1000
  ): Promise<{ merkleRoot: string | null; treeSize: string; leaves: StateTreeLeaf[] }> {
    const leaves: StateTreeLeaf[] = [];
    let merkleRoot: string | null = null;
    let treeSize: string = "0";
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.fetch(pool, { limit: batchSize, offset });

      // Capture merkleRoot and treeSize from first response
      if (offset === 0) {
        merkleRoot = response.merkleRoot;
        treeSize = response.treeSize;
      }

      leaves.push(...response.data);
      hasMore = response.pagination.hasMore;
      offset += response.data.length;
    }

    return { merkleRoot, treeSize, leaves };
  }
}
