import type { PaginatedResponse, PaginationOptions } from "../types";

/**
 * Async iterator for paginated API responses (offset-based)
 */
export class PaginatedIterator<T> implements AsyncIterable<T[]> {
  private fetcher: (pagination: PaginationOptions) => Promise<PaginatedResponse<T>>;
  private batchSize: number;
  private initialOffset: number;

  constructor(
    fetcher: (pagination: PaginationOptions) => Promise<PaginatedResponse<T>>,
    batchSize: number = 50,
    initialOffset: number = 0
  ) {
    this.fetcher = fetcher;
    this.batchSize = batchSize;
    this.initialOffset = initialOffset;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T[]> {
    let offset = this.initialOffset;
    let hasMore = true;

    while (hasMore) {
      const response = await this.fetcher({
        limit: this.batchSize,
        offset,
      });

      if (response.data.length > 0) {
        yield response.data;
      }

      hasMore = response.pagination.hasMore;
      offset += response.data.length;

      if (response.data.length === 0) {
        hasMore = false;
      }
    }
  }

  /**
   * Collect all items into a single array
   */
  async toArray(): Promise<T[]> {
    const results: T[] = [];
    for await (const batch of this) {
      results.push(...batch);
    }
    return results;
  }

  /**
   * Get total count from first page (if available)
   */
  async count(): Promise<number> {
    const response = await this.fetcher({ limit: 1 });
    return response.pagination.total;
  }

  /**
   * Get first batch only
   */
  async first(): Promise<T[]> {
    const response = await this.fetcher({ limit: this.batchSize });
    return response.data;
  }
}
