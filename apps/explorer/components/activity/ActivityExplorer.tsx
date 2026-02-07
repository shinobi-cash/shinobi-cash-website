"use client";

import { useEffect } from "react";
import { ActivityExplorerController } from "@/controllers/ActivityExplorerController";
import { ActivityExplorerHeader } from "./ActivityExplorerHeader";
import { ActivityFeed } from "./ActivityFeed";
import { ActivityDetailsPanel } from "./ActivityDetailsPanel";

export function ActivityExplorer() {
  useEffect(() => {
    ActivityExplorerController.initialize();
    return () => ActivityExplorerController.reset();
  }, []);

  return (
    <div className="bg-linear-to-br flex h-screen flex-col from-neutral-950 via-neutral-900 to-black">
      <ActivityExplorerHeader />

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 pb-6 pt-6 sm:px-6">
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_420px]">
          <ActivityFeed />
          <ActivityDetailsPanel />
        </div>
      </main>
    </div>
  );
}
