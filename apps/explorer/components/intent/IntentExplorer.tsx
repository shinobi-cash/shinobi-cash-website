"use client";

import { useState } from "react";
import type { Intent } from "@shinobi-cash/data";
import type { IntentTypeFilter, IntentPhaseFilter } from "@/services/data/indexerService";
import { IntentExplorerHeader } from "./IntentExplorerHeader";
import { IntentFeed } from "./IntentFeed";
import { IntentFilters } from "./IntentFilters";
import { IntentDetailsPanel } from "./IntentDetailsPanel";

export function IntentExplorer() {
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [intentType, setIntentType] = useState<IntentTypeFilter | undefined>(undefined);
  const [phase, setPhase] = useState<IntentPhaseFilter | undefined>(undefined);

  const filters = {
    intentType,
    phase,
  };

  return (
    <div className="bg-linear-to-br flex h-screen flex-col from-neutral-950 via-neutral-900 to-black">
      <IntentExplorerHeader />

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 px-4 pb-6 pt-6 sm:px-6">
        <div className="grid min-h-0 w-full gap-6 lg:grid-cols-[1fr_420px]">
          {/* Left column */}
          <div className="flex min-h-0 flex-col space-y-4">
            <div className="shrink-0">
              <IntentFilters
                intentType={intentType}
                phase={phase}
                onIntentTypeChange={setIntentType}
                onPhaseChange={setPhase}
              />
            </div>
            <div className="min-h-0 flex-1">
              <IntentFeed onSelect={setSelectedIntent} filters={filters} />
            </div>
          </div>

          {/* Right column */}
          <IntentDetailsPanel
            intent={selectedIntent}
            onClose={() => setSelectedIntent(null)}
          />
        </div>
      </main>
    </div>
  );
}
