/// <reference lib="webworker" />

let intervalId: number | null = null;

async function fetchActivities(poolAddress: string, limit: number) {
  const response = await fetch("/api/indexer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: "activities",
      params: { poolAddress, limit, orderDirection: "desc" },
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch activities");
  }

  return result.data;
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "START") {
    const { poolAddress, intervalMs } = payload;

    if (intervalId) return;

    intervalId = self.setInterval(async () => {
      try {
        const result = await fetchActivities(poolAddress, 100);
        self.postMessage({
          type: "SYNC_RESULT",
          payload: result,
        });
      } catch (err) {
        self.postMessage({
          type: "SYNC_ERROR",
          payload: String(err),
        });
      }
    }, intervalMs);
  }

  if (type === "STOP") {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
