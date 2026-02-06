"use client";

import { useSnapshot } from "valtio";
import { ActivityExplorerController, ActivityExplorerSelectors } from "@/controllers/ActivityExplorerController";
import { ActivityRow } from "../explorer/ActivityRow";
import { ActivityRowSkeleton } from "../explorer/ActivityRowSkeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ActivityFeed() {
  const state = useSnapshot(ActivityExplorerController.state);

  const canGoPrevious = ActivityExplorerSelectors.canGoPrevious();
  const canGoNext = ActivityExplorerSelectors.canGoNext();

  return (
    <section className="bg-white/2 flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10">
      <div className="shrink-0 flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-medium text-white">Pool Activity</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-white/5">
          {state.isLoadingList && Array.from({ length: 8 }).map((_, i) => (
            <ActivityRowSkeleton key={i} />
          ))}

          {!state.isLoadingList && state.listError && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-400">Failed to load activities</p>
              <p className="mt-1 text-xs text-neutral-500">{state.listError}</p>
            </div>
          )}

          {!state.isLoadingList && !state.listError && state.activities.length === 0 && (
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
        </div>
      </div>

      {/* Pagination */}
      <div className="shrink-0 flex items-center justify-between border-t border-white/10 px-5 py-3">
        <button
          onClick={() => ActivityExplorerController.previousPage()}
          disabled={!canGoPrevious}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="text-xs text-neutral-500">Page {state.page + 1}</span>
        <button
          onClick={() => ActivityExplorerController.nextPage()}
          disabled={!canGoNext}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
