"use client";

import { useState } from "react";
import type { Activity } from "@shinobi-cash/data";
import { ExplorerHeader } from "./ExplorerHeader";
import { StatsOverview } from "./StatsOverview";
import { ActivityFeed } from "./ActivityFeed";
import { ActivityDetailsPanel } from "./ActivityDetailsPanel";
import { AssetSelector } from "./AssetSelector";

export function Explorer() {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  return (
    <div className="bg-linear-to-br flex h-screen flex-col from-neutral-950 via-neutral-900 to-black">
      <ExplorerHeader />

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 px-4 pb-6 pt-6 sm:px-6">
        <div className="grid min-h-0 w-full gap-6 lg:grid-cols-[1fr_420px]">
          {/* Left column */}
          <div className="flex min-h-0 flex-col space-y-6">
            <div className="shrink-0 space-y-4">
              <StatsOverview />
              <AssetSelector />
            </div>
            <div className="min-h-0 flex-1">
              <ActivityFeed onSelect={setSelectedActivity} />
            </div>
          </div>

          {/* Right column */}
          <ActivityDetailsPanel
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
          />
        </div>
      </main>
    </div>
  );
}
