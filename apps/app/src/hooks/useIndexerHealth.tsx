import { useEffect, useState } from "react";
import { checkIndexerHealth } from "@/services/IndexerService";

type IndexerHealthState = { status: "loading" } | { status: "healthy" } | { status: "unhealthy" };

export function useIndexerHealth(pollIntervalMs = 30_000) {
  const [state, setState] = useState<IndexerHealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const healthy = await checkIndexerHealth();
        if (!cancelled) {
          setState({ status: healthy ? "healthy" : "unhealthy" });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "unhealthy" });
        }
      }
    };

    check();
    const id = setInterval(check, pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollIntervalMs]);

  return state;
}
