import { fetchLatestIndexedBlock } from "@/services/data/indexerService";
import { useEffect, useState } from "react";
import { useTransactionTracking } from "../transactions/useTransactionTracking";

export function useIndexerHealth() {
  const { trackingStatus } = useTransactionTracking();
  const [indexerHealth, setIndexerHealth] = useState<boolean | null>(null);

  // Only check indexer health when transaction tracking is idle
  useEffect(() => {
    if (trackingStatus !== "idle") {
      // Reset health status when tracking is active
      setIndexerHealth(null);
      return;
    }

    const checkIndexerHealthStatus = async () => {
      try {
        const latestBlock = await fetchLatestIndexedBlock();
        const isHealthy = latestBlock !== null;
        setIndexerHealth(isHealthy);
      } catch (error) {
        console.error("Indexer health check failed:", error);
        setIndexerHealth(false);
      }
    };

    // Check immediately and then every 30 seconds
    checkIndexerHealthStatus();
    const interval = setInterval(checkIndexerHealthStatus, 30000);

    return () => clearInterval(interval);
  }, [trackingStatus]);

  return {
    indexerHealth,
    shouldShowHealth: trackingStatus === "idle",
    isHealthy: indexerHealth === true,
    isOffline: indexerHealth === false,
    isChecking: indexerHealth === null,
  };
}
