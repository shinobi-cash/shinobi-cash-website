"use client";

import { useSnapshot } from "valtio";
import { X, Loader2 } from "lucide-react";
import { ActivityExplorerController } from "@/controllers/ActivityExplorerController";
import { ActivityDetailsContent } from "./ActivityDetailsContent";

export function ActivityDetailsPanel() {
  const state = useSnapshot(ActivityExplorerController.state);

  // No selection
  if (!state.selectedTxHash) {
    return (
      <aside className="bg-white/2 hidden h-full rounded-2xl border border-white/10 p-6 lg:block">
        <p className="text-sm text-neutral-400">Select an activity to view details</p>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        onClick={() => ActivityExplorerController.clearSelection()}
      />

      {/* Panel */}
      <aside className="lg:bg-white/2 fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-neutral-950 lg:static lg:h-full lg:max-h-none lg:rounded-2xl lg:border">
        {/* Mobile header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 lg:hidden">
          <span className="text-sm font-medium text-white">Activity Details</span>
          <button
            onClick={() => ActivityExplorerController.clearSelection()}
            className="rounded-md p-1 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Loading state */}
          {state.isLoadingDetails && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
          )}

          {/* Error state */}
          {!state.isLoadingDetails && state.detailsError && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-400">Failed to load activity details</p>
              <p className="mt-1 text-xs text-neutral-500">{state.detailsError}</p>
            </div>
          )}

          {/* Content */}
          {!state.isLoadingDetails && !state.detailsError && state.selectedActivity && (
            <ActivityDetailsContent
              activity={state.selectedActivity}
              timeline={state.selectedTimeline}
            />
          )}
        </div>
      </aside>
    </>
  );
}
