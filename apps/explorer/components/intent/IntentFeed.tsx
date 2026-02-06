"use client";

import { useSnapshot } from "valtio";
import { IntentExplorerController, IntentExplorerSelectors } from "@/controllers/IntentExplorerController";
import { IntentRow } from "./IntentRow";
import { IntentRowSkeleton } from "./IntentRowSkeleton";
import { IntentFilters } from "./IntentFilters";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function IntentFeed() {
  const state = useSnapshot(IntentExplorerController.state);

  const intents = IntentExplorerSelectors.getDisplayIntents();
  const isInSearchMode = IntentExplorerSelectors.isInSearchMode();
  const canGoPrevious = IntentExplorerSelectors.canGoPrevious();
  const canGoNext = IntentExplorerSelectors.canGoNext();
  const searchNotFound = !!state.activeSearchOrderId && !state.isSearching && !state.searchedIntent;

  return (
    <section className="bg-white/2 flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10">
      <div className="shrink-0 flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-medium text-white">Intents</h2>
        <IntentFilters
          intentType={state.filters.intentType}
          phase={state.filters.phase}
          originChainId={state.filters.originChainId}
          destinationChainId={state.filters.destinationChainId}
          onIntentTypeChange={(v) => IntentExplorerController.setFilter("intentType", v)}
          onPhaseChange={(v) => IntentExplorerController.setFilter("phase", v)}
          onOriginChainIdChange={(v) => IntentExplorerController.setFilter("originChainId", v)}
          onDestinationChainIdChange={(v) => IntentExplorerController.setFilter("destinationChainId", v)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-white/5">
          {/* Search mode: show searching state */}
          {state.isSearching && (
            <div className="p-4">
              <IntentRowSkeleton />
            </div>
          )}

          {/* Search not found */}
          {!state.isSearching && searchNotFound && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-400">Intent not found</p>
              <p className="mt-1 text-xs text-neutral-500">No intent exists with this Order ID</p>
            </div>
          )}

          {/* Normal list mode */}
          {!state.isSearching && !searchNotFound && (
            <>
              {state.isLoadingList && Array.from({ length: 8 }).map((_, i) => (
                <IntentRowSkeleton key={i} />
              ))}

              {!state.isLoadingList && state.listError && (
                <div className="p-6 text-center">
                  <p className="text-sm text-red-400">Failed to load intents</p>
                  <p className="mt-1 text-xs text-neutral-500">{state.listError}</p>
                </div>
              )}

              {!state.isLoadingList && !state.listError && intents.length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-sm text-neutral-400">No intents found</p>
                  <p className="mt-1 text-xs text-neutral-500">Try adjusting filters or wait for new intents</p>
                </div>
              )}

              {intents.map((intent) => {
                const isSelected = intent.orderId === state.selectedIntent?.orderId;
                return (
                  <button
                    key={intent.orderId}
                    onClick={() => IntentExplorerController.selectIntent(intent)}
                    className={`w-full text-left transition ${
                      isSelected
                        ? "bg-white/8 border-l-2 border-l-orange-500"
                        : "hover:bg-white/4 border-l-2 border-l-transparent"
                    }`}
                  >
                    <IntentRow intent={intent} />
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Pagination - hide in search mode */}
      {!isInSearchMode && (
        <div className="shrink-0 flex items-center justify-between border-t border-white/10 px-5 py-3">
          <button
            onClick={() => IntentExplorerController.previousPage()}
            disabled={!canGoPrevious}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-xs text-neutral-500">Page {state.page + 1}</span>
          <button
            onClick={() => IntentExplorerController.nextPage()}
            disabled={!canGoNext}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
