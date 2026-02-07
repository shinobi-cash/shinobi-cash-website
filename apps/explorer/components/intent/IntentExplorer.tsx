"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import { IntentExplorerController } from "@/controllers/IntentExplorerController";
import { IntentExplorerHeader } from "./IntentExplorerHeader";
import { IntentFeed } from "./IntentFeed";
import { IntentDetailsPanel } from "./IntentDetailsPanel";

export function IntentExplorer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { searchOrderId, isSearching } = useSnapshot(IntentExplorerController.state);

  const urlOrderId = searchParams.get("orderId");

  // Initialize on mount and sync URL param changes
  useEffect(() => {
    IntentExplorerController.initialize(urlOrderId);
    return () => IntentExplorerController.reset();
  }, [urlOrderId]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      IntentExplorerController.executeSearch();
    }
  };

  const handleClearSearch = () => {
    IntentExplorerController.clearSearch();
    router.push("/intents", { scroll: false });
  };

  return (
    <div className="bg-linear-to-br flex h-screen flex-col from-neutral-950 via-neutral-900 to-black">
      <IntentExplorerHeader />

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 pb-6 pt-6 sm:px-6">
        {/* Search by Order ID */}
        <div className="mb-4 shrink-0 lg:max-w-[calc(100%-420px-24px)]">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-400" />
            ) : (
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            )}
            <Input
              type="text"
              placeholder="Search by Order ID (0x...) and press Enter"
              value={searchOrderId}
              onChange={(e) => IntentExplorerController.setSearchOrderId(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-10 border-white/10 bg-white/5! pl-10 pr-10 text-white placeholder:text-neutral-500 focus-visible:border-white/20 focus-visible:bg-white/10! focus-visible:ring-0"
            />
            {searchOrderId && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_420px]">
          <IntentFeed />
          <IntentDetailsPanel />
        </div>
      </main>
    </div>
  );
}
