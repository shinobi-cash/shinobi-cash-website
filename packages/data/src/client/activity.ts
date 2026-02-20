import type {
  ActivityItem,
  ActivityDetailResponse,
  PaginatedResponse,
  PaginationOptions,
} from "../types";
import { PaginatedIterator } from "../pagination/iterator";

interface ActivityClientConfig {
  endpoint: string;
  authToken?: string;
  timeout: number;
}

interface ActivityFilters {
  pool?: string;
  type?: string;
  chainId?: number | string;
  user?: string;
  aspStatus?: string;
}

/**
 * Client for /v2/activity endpoint
 */
export class ActivityClient {
  private config: ActivityClientConfig;

  constructor(config: ActivityClientConfig) {
    this.config = config;
  }

  /**
   * Fetch a single page of activities
   */
  async fetch(
    filters?: ActivityFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<ActivityItem>> {
    const params = new URLSearchParams();

    if (filters?.pool) params.set("pool", filters.pool);
    if (filters?.type) params.set("type", filters.type);
    if (filters?.chainId) params.set("chainId", String(filters.chainId));
    if (filters?.user) params.set("user", filters.user);
    if (filters?.aspStatus) params.set("aspStatus", filters.aspStatus);

    if (pagination?.limit) params.set("limit", String(pagination.limit));
    if (pagination?.offset) params.set("offset", String(pagination.offset));

    const url = `${this.config.endpoint}/v2/activity${params.toString() ? `?${params}` : ""}`;

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
        throw new Error(`Activity fetch failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as PaginatedResponse<ActivityItem>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get activity detail by txHash with timeline
   */
  async getByTxHash(txHash: string): Promise<ActivityDetailResponse | null> {
    const url = `${this.config.endpoint}/v2/activity/${txHash.toLowerCase()}`;

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
        throw new Error(`Activity detail fetch failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as ActivityDetailResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create async iterator for paginated results
   */
  iterate(filters?: ActivityFilters, batchSize: number = 50): PaginatedIterator<ActivityItem> {
    return new PaginatedIterator((pagination) => this.fetch(filters, pagination), batchSize);
  }

  /**
   * Fetch all activities (use with caution on large datasets)
   */
  async fetchAll(filters?: ActivityFilters): Promise<ActivityItem[]> {
    return this.iterate(filters).toArray();
  }
}
