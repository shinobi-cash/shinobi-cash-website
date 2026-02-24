import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createIndexer } from "../src/create-indexer";

const TEST_ENDPOINT = "http://localhost:3000";

describe("createIndexer", () => {
  it("should return an object with all expected methods", () => {
    const indexer = createIndexer({ endpoint: TEST_ENDPOINT });

    expect(typeof indexer.health).toBe("function");
    expect(typeof indexer.getActivities).toBe("function");
    expect(typeof indexer.getActivityByTxHash).toBe("function");
    expect(typeof indexer.getAllActivities).toBe("function");
    expect(typeof indexer.getStats).toBe("function");
    expect(typeof indexer.getStateTree).toBe("function");
    expect(typeof indexer.getIntents).toBe("function");
    expect(typeof indexer.getIntent).toBe("function");
    expect(typeof indexer.getPools).toBe("function");
    expect(typeof indexer.getPool).toBe("function");
    expect(typeof indexer.getApprovedLabels).toBe("function");
    expect(typeof indexer.getLatestASPRoot).toBe("function");
  });

  describe("health", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should return true on 200 response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      const indexer = createIndexer({ endpoint: TEST_ENDPOINT });
      const result = await indexer.health();

      expect(result).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${TEST_ENDPOINT}/v2/health`,
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should return false on non-200 response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
      const indexer = createIndexer({ endpoint: TEST_ENDPOINT });

      expect(await indexer.health()).toBe(false);
    });

    it("should return false on network error", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const indexer = createIndexer({ endpoint: TEST_ENDPOINT });

      expect(await indexer.health()).toBe(false);
    });

    it("should strip trailing slash from endpoint", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      const indexer = createIndexer({ endpoint: "http://localhost:3000/" });
      await indexer.health();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://localhost:3000/v2/health",
        expect.anything()
      );
    });
  });

  describe("delegation to sub-clients", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("getActivities should call activity endpoint", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            pagination: { limit: 50, offset: 0, total: 0, hasMore: false },
          }),
      });

      const indexer = createIndexer({ endpoint: TEST_ENDPOINT });
      const result = await indexer.getActivities({ pool: "0xpool" }, { limit: 10 });

      expect(result.data).toEqual([]);
      expect(globalThis.fetch).toHaveBeenCalled();
      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("/v2/activity");
      expect(calledUrl).toContain("pool=0xpool");
    });

    it("getActivityByTxHash should call detail endpoint", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            activity: { type: "DEPOSIT", txHash: "0xabc" },
            timeline: null,
          }),
      });

      const indexer = createIndexer({ endpoint: TEST_ENDPOINT });
      const result = await indexer.getActivityByTxHash("0xabc");

      expect(result).toBeDefined();
      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("/v2/activity/0xabc");
    });

    it("getIntent should call intent detail endpoint", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ orderId: "0xorder123" }),
      });

      const indexer = createIndexer({ endpoint: TEST_ENDPOINT });
      const result = await indexer.getIntent("0xorder123");

      expect(result).toBeDefined();
      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("/v2/intents/0xorder123");
    });

    it("should forward auth token to sub-clients", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            pagination: { limit: 50, offset: 0, total: 0, hasMore: false },
          }),
      });

      const indexer = createIndexer({
        endpoint: TEST_ENDPOINT,
        authToken: "test-token",
      });
      await indexer.getActivities();

      const calledOptions = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect(calledOptions.headers).toBeDefined();
      const headers = calledOptions.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer test-token");
    });
  });
});
