"use client";

import { useRef, useEffect } from "react";
import type { Activity } from "@shinobi-cash/data";
import { useActivities } from "@/hooks/data/useActivities";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { ActivityRow } from "./ActivityRow";
import { ActivityRowSkeleton } from "./ActivityRowSkeleton";

interface Props {
  onSelect: (activity: Activity) => void;
}

export function ActivityFeed({ onSelect }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useActivities(
    SHINOBI_CASH_ETH_POOL.address,
    15
  );

  const activities = data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section className="bg-white/2 flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10">
      <div className="shrink-0 border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-medium text-white">Recent Activity</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-white/5">
          {isLoading && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <ActivityRowSkeleton key={i} />
              ))}
            </>
          )}

          {!isLoading && error && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-400">Failed to load activity</p>
              <p className="mt-1 text-xs text-neutral-500">Please check your connection</p>
            </div>
          )}

          {!isLoading && !error && activities.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-neutral-400">No activity yet</p>
              <p className="mt-1 text-xs text-neutral-500">Pool is ready for deposits</p>
            </div>
          )}

          {activities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => onSelect(activity)}
              className="hover:bg-white/4 w-full text-left transition"
            >
              <ActivityRow activity={activity} />
            </button>
          ))}

          {hasNextPage && (
            <div ref={sentinelRef} className="h-12">
              {isFetchingNextPage && (
                <div className="p-4">
                  <ActivityRowSkeleton />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
