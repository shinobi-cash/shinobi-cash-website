import type { StatsResponse, StatsFilters } from "../types";

interface StatsClientConfig {
  endpoint: string;
  authToken?: string;
  timeout: number;
}

/**
 * Client for /v2/stats endpoint
 */
export class StatsClient {
  private config: StatsClientConfig;

  constructor(config: StatsClientConfig) {
    this.config = config;
  }

  /**
   * Fetch pool statistics
   */
  async fetch(filters?: StatsFilters): Promise<StatsResponse> {
    const params = new URLSearchParams();

    if (filters?.pool) params.set("pool", filters.pool);
    if (filters?.chainId) params.set("chainId", String(filters.chainId));

    const url = `${this.config.endpoint}/v2/stats${params.toString() ? `?${params}` : ""}`;

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
        throw new Error(`Stats fetch failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as StatsResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
