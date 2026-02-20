interface GraphQLClientConfig {
  endpoint: string;
  authToken?: string;
  timeout: number;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

/**
 * Client for GraphQL endpoints (/graphql or /proxy/graphql)
 */
export class GraphQLClient {
  private config: GraphQLClientConfig;

  constructor(config: GraphQLClientConfig) {
    this.config = config;
  }

  /**
   * Execute a GraphQL query
   */
  async query<T>(
    query: string,
    variables?: Record<string, unknown>,
    options?: { useProxy?: boolean }
  ): Promise<T> {
    const path = options?.useProxy ? "/proxy/graphql" : "/graphql";
    const url = `${this.config.endpoint}${path}`;

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
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as GraphQLResponse<T>;

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.message).join(", ");
        throw new Error(`GraphQL errors: ${errorMessages}`);
      }

      if (!result.data) {
        throw new Error("GraphQL response missing data");
      }

      return result.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
