/// <reference lib="webworker" />

import { fetchActivities } from "@/services/IndexerService";

let intervalId: number | null = null;

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
