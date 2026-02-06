"use client";

import { useRef, useEffect } from "react";
import { useSnapshot } from "valtio";
import { ActivityExplorerController, ActivityExplorerSelectors } from "@/controllers/ActivityExplorerController";
import { ActivityRow } from "./ActivityRow";
import { ActivityRowSkeleton } from "./ActivityRowSkeleton";

export function ActivityFeed() {
  const state = useSnapshot(ActivityExplorerController.state);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isLoading = ActivityExplorerSelectors.isLoading();
  const isFetchingMore = ActivityExplorerSelectors.isFetchingMore();
  const canFetchMore = ActivityExplorerSelectors.canFetchMore();

  useEffect(() => {
    if (!sentinelRef.current || !canFetchMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && canFetchMore) {
          ActivityExplorerController.fetchMore();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [canFetchMore]);

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

          {!isLoading && state.listError && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-400">Failed to load activity</p>
              <p className="mt-1 text-xs text-neutral-500">{state.listError}</p>
            </div>
          )}

          {!isLoading && !state.listError && state.activities.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-neutral-400">No activity yet</p>
              <p className="mt-1 text-xs text-neutral-500">Pool is ready for deposits</p>
            </div>
          )}

          {state.activities.map((activity) => {
            const isSelected = activity.id === state.selectedActivity?.id;
            return (
              <button
                key={activity.id}
                onClick={() => ActivityExplorerController.selectActivity(activity)}
                className={`w-full text-left transition ${
                  isSelected
                    ? "bg-white/8 border-l-2 border-l-orange-500"
                    : "hover:bg-white/4 border-l-2 border-l-transparent"
                }`}
              >
                <ActivityRow activity={activity} />
              </button>
            );
          })}

          {state.hasNextPage && (
            <div ref={sentinelRef} className="h-12">
              {isFetchingMore && (
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
