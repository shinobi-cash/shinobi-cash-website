interface ASPClientConfig {
  endpoint: string;
  authToken?: string;
  timeout: number;
}

interface LabelItem {
  label: string;
  status: string;
}

interface LabelsResponse {
  data: LabelItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ASPRootInfo {
  aspRoot: string;
  ipfsCid: string;
  timestamp: string;
  eventTimestamp: string;
}

interface ASPRootResponse {
  data: ASPRootInfo | null;
}

/**
 * Client for /v2/labels endpoint (ASP label status)
 */
export class ASPClient {
  private config: ASPClientConfig;

  constructor(config: ASPClientConfig) {
    this.config = config;
  }

  /**
   * Fetch labels by status
   */
  async fetchLabels(
    status?: "pending" | "approved",
    pagination?: { limit?: number; offset?: number }
  ): Promise<LabelsResponse> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (pagination?.limit) params.set("limit", String(pagination.limit));
    if (pagination?.offset) params.set("offset", String(pagination.offset));

    const url = `${this.config.endpoint}/v2/labels${params.toString() ? `?${params}` : ""}`;

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
        throw new Error(`ASP labels fetch failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as LabelsResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch all approved labels (paginated)
   */
  async fetchAllApprovedLabels(): Promise<string[]> {
    const labels: string[] = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
      const response = await this.fetchLabels("approved", { limit, offset });
      labels.push(...response.data.map((item) => item.label));

      if (!response.pagination.hasMore) {
        break;
      }
      offset += limit;
    }

    return labels;
  }

  /**
   * Fetch latest ASP root info including IPFS CID
   * Used to fetch precomputed proofs from IPFS (v2.1 format)
   */
  async fetchLatestASPRoot(): Promise<ASPRootInfo | null> {
    const url = `${this.config.endpoint}/v2/asp-root/latest`;

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
        throw new Error(`ASP root fetch failed: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as ASPRootResponse;
      return result.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
