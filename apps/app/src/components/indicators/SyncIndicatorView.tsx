import { RotateCw } from "lucide-react";
import { AnimatedCircularProgressBar } from "@workspace/ui/components/animated-circular-progress-bar";

interface SyncIndicatorViewProps {
  autoSyncEnabled: boolean;
  isSyncing: boolean;
  timeLeft: number;
  progress: number;
  onSync: () => void;
}

export function SyncIndicatorView({
  autoSyncEnabled,
  isSyncing,
  timeLeft,
  progress,
  onSync,
}: SyncIndicatorViewProps) {
  if (!autoSyncEnabled) {
    return (
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="group relative cursor-pointer rounded-lg p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={isSyncing ? "Syncing..." : "Sync now"}
        title="Manual sync only (auto-sync disabled)"
      >
        <RotateCw
          className={`h-4 w-4 text-muted-foreground ${
            isSyncing ? "animate-spin" : "group-hover:text-foreground"
          }`}
        />
      </button>
    );
  }

  return (
    <button
      onClick={onSync}
      disabled={isSyncing}
      aria-busy={isSyncing}
      aria-label={isSyncing ? "Syncing..." : "Sync now"}
      title={isSyncing ? "Syncing..." : `Next auto-sync in ${timeLeft}s`}
      className="group relative cursor-pointer disabled:cursor-not-allowed"
    >
      <AnimatedCircularProgressBar
        max={100}
        min={0}
        value={progress}
        gaugePrimaryColor="oklch(0.705 0.213 47.604)"
        gaugeSecondaryColor="oklch(0.269 0 0)"
        className="size-8 transition-opacity group-hover:opacity-80"
      >
        <div className="flex items-center justify-center">
          {isSyncing ? (
            <RotateCw className="text-primary size-4 animate-spin" />
          ) : (
            <span className="text-primary text-sm font-semibold tabular-nums">{timeLeft}</span>
          )}
        </div>
      </AnimatedCircularProgressBar>
    </button>
  );
}
