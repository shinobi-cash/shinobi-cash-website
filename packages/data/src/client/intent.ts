import type {
  Intent,
  IntentFilters,
  PaginatedResponse,
  PaginationOptions,
} from "../types/index.js";

interface IntentClientConfig {
  endpoint: string;
  authToken?: string;
  timeout: number;
}

/**
 * Client for /v2/intents endpoint
 */
export class IntentClient {
  private config: IntentClientConfig;

  constructor(config: IntentClientConfig) {
    this.config = config;
  }

  /**
   * Fetch a single page of intents
   */
  async fetch(
    filters?: IntentFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<Intent>> {
    const params = new URLSearchParams();

    if (filters?.intentType) params.set("intentType", filters.intentType);
    if (filters?.phase) params.set("phase", filters.phase);

    if (pagination?.limit) params.set("limit", String(pagination.limit));
    if (pagination?.offset) params.set("offset", String(pagination.offset));

    const url = `${this.config.endpoint}/v2/intents${params.toString() ? `?${params}` : ""}`;

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
        throw new Error(`Intent fetch failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as PaginatedResponse<Intent>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get intent by orderId
   */
  async getById(orderId: string): Promise<Intent | null> {
    const url = `${this.config.endpoint}/v2/intents/${orderId}`;

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
        throw new Error(`Intent fetch failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as Intent;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
