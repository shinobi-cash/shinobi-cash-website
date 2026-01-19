"use client";

import { useIndexerHealth } from "@/hooks/useIndexerHealth";

export function IndexerHealthIndicator() {
  const health = useIndexerHealth();

  if (health.status === "loading") {
    return null;
  }

  const isHealthy = health.status === "healthy";

  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      title={isHealthy ? "Indexer online" : "Indexer offline"}
    >
      <div className="relative">
        <div className={`h-2 w-2 rounded-full ${isHealthy ? "bg-green-500" : "bg-red-500"}`} />
        {isHealthy && (
          <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-green-500 opacity-75" />
        )}
      </div>
      <span className="text-xs text-muted-foreground">{isHealthy ? "Online" : "Offline"}</span>
    </div>
  );
}
