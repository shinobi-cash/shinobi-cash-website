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
        <div className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-400" : "bg-rose-400"}`} />
        {isHealthy && (
          <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
      </div>
      <span className="text-neutral-400 text-xs">{isHealthy ? "Online" : "Offline"}</span>
    </div>
  );
}
