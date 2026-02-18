import type { Pool, PaginatedResponse, PaginationOptions } from "../types";

interface PoolClientConfig {
  endpoint: string;
  authToken?: string;
  timeout: number;
}

/**
 * Client for /v2/pools endpoint
 */
export class PoolClient {
  private config: PoolClientConfig;

  constructor(config: PoolClientConfig) {
    this.config = config;
  }

  /**
   * Fetch a single page of registered pools
   */
  async fetch(pagination?: PaginationOptions): Promise<PaginatedResponse<Pool>> {
    const params = new URLSearchParams();

    if (pagination?.limit) params.set("limit", String(pagination.limit));
    if (pagination?.offset) params.set("offset", String(pagination.offset));

    const url = `${this.config.endpoint}/v2/pools${params.toString() ? `?${params}` : ""}`;

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
        throw new Error(`Pool fetch failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as PaginatedResponse<Pool>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get pool by address
   */
  async getByAddress(address: string): Promise<Pool | null> {
    const url = `${this.config.endpoint}/v2/pools/${address.toLowerCase()}`;

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

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Pool fetch failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as Pool;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
