"use client";

import { useState, useEffect } from "react";
import { checkIndexerHealth } from "@/services/data/indexerService";

export function IndexerHealthIndicator() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await checkIndexerHealth();
      setIsHealthy(healthy);
    };

    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  // Don't render anything until first check completes
  if (isHealthy === null) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2"
      title={isHealthy ? "Indexer online" : "Indexer offline"}
    >
      <div className="relative">
        <div className={`h-2 w-2 rounded-full ${isHealthy ? "bg-green-500" : "bg-red-500"}`} />
        {isHealthy && (
          <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-green-500 opacity-75" />
        )}
      </div>
      <span className="text-xs text-gray-400">{isHealthy ? "Online" : "Offline"}</span>
    </div>
  );
}
