"use client";

import { useRef, useEffect } from "react";
import type { Intent } from "@shinobi-cash/data";
import { useIntents } from "@/hooks/data/useIntents";
import type { IntentFilters } from "@/services/data/indexerService";
import { IntentRow } from "./IntentRow";
import { IntentRowSkeleton } from "./IntentRowSkeleton";

interface Props {
  onSelect: (intent: Intent) => void;
  filters?: IntentFilters;
}

export function IntentFeed({ onSelect, filters = {} }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useIntents(
    15,
    filters
  );

  const intents = data?.pages.flatMap((p) => p.items) ?? [];

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
        <h2 className="text-sm font-medium text-white">Cross-Chain Intents</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-white/5">
          {isLoading && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <IntentRowSkeleton key={i} />
              ))}
            </>
          )}

          {!isLoading && error && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-400">Failed to load intents</p>
              <p className="mt-1 text-xs text-neutral-500">Please check your connection</p>
            </div>
          )}

          {!isLoading && !error && intents.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-neutral-400">No intents found</p>
              <p className="mt-1 text-xs text-neutral-500">Try adjusting filters or wait for new intents</p>
            </div>
          )}

          {intents.map((intent) => (
            <button
              key={intent.orderId}
              onClick={() => onSelect(intent)}
              className="hover:bg-white/4 w-full text-left transition"
            >
              <IntentRow intent={intent} />
            </button>
          ))}

          {hasNextPage && (
            <div ref={sentinelRef} className="h-12">
              {isFetchingNextPage && (
                <div className="p-4">
                  <IntentRowSkeleton />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
