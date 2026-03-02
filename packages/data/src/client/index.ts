import type { IndexerClientOptions } from "../types/index.js";
import { ActivityClient } from "./activity.js";
import { StatsClient } from "./stats.js";
import { StateTreeClient } from "./state-tree.js";
import { IntentClient } from "./intent.js";
import { PoolClient } from "./pool.js";
import { ASPClient } from "./asp.js";

const DEFAULT_TIMEOUT = 30000;

/**
 * Main client for the V2 indexer API
 */
export class IndexerClient {
  readonly activity: ActivityClient;
  readonly stats: StatsClient;
  readonly stateTree: StateTreeClient;
  readonly intent: IntentClient;
  readonly pool: PoolClient;
  readonly asp: ASPClient;

  private endpoint: string;
  private authToken?: string;
  private timeout: number;

  constructor(options: IndexerClientOptions) {
    this.endpoint = options.endpoint.replace(/\/$/, ""); // Remove trailing slash
    this.authToken = options.authToken;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;

    const config = {
      endpoint: this.endpoint,
      authToken: this.authToken,
      timeout: this.timeout,
    };

    this.activity = new ActivityClient(config);
    this.stats = new StatsClient(config);
    this.stateTree = new StateTreeClient(config);
    this.intent = new IntentClient(config);
    this.pool = new PoolClient(config);
    this.asp = new ASPClient(config);
  }

  /**
   * Get the configured endpoint
   */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  /**
   * Health check - returns true if indexer is reachable
   */
  async health(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}/v2/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export { ActivityClient } from "./activity.js";
export { StatsClient } from "./stats.js";
export { StateTreeClient } from "./state-tree.js";
export { IntentClient } from "./intent.js";
export { PoolClient } from "./pool.js";
export { ASPClient, type ASPRootInfo } from "./asp.js";
