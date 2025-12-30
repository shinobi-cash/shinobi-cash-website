"use client";

import { useState, useEffect } from "react";
import { AnimatedCircularProgressBar } from "@workspace/ui/components/animated-circular-progress-bar";
import { RotateCw } from "lucide-react";

interface SyncIndicatorProps {
  onSync: () => void | Promise<void>;
  autoSyncInterval?: number; // in seconds, default 10
}

export function SyncIndicator({ onSync, autoSyncInterval = 10 }: SyncIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState(autoSyncInterval);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      await onSync();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
      setTimeLeft(autoSyncInterval);
    }
  };

    // Countdown timer
  useEffect(() => {
    if (isSyncing) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-sync triggered
          handleSync();
          return autoSyncInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSyncing, autoSyncInterval]);


  // Calculate progress (countdown from 100% to 0%)
  const progress = (timeLeft / autoSyncInterval) * 100;

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="group relative cursor-pointer disabled:cursor-not-allowed"
      aria-label={isSyncing ? "Syncing..." : "Sync now"}
      title={isSyncing ? "Syncing..." : `Next auto-sync in ${timeLeft}s`}
    >
      <AnimatedCircularProgressBar
        max={100}
        min={0}
        value={progress}
        // gaugePrimaryColor="hsl(var(--primary))"
        // gaugeSecondaryColor="hsl(var(--muted))"
        gaugePrimaryColor="oklch(0.627 0.265 303.9)" // Primary accent color
        gaugeSecondaryColor="oklch(0.269 0 0)" // Muted border color
        className="size-8 transition-opacity group-hover:opacity-80"
      >
        <div className="flex flex-col items-center justify-center">
          {isSyncing ? (
            <RotateCw className="size-4 animate-spin text-primary" />
          ) : (
            <span className="text-sm font-semibold tabular-nums text-primary">{timeLeft}</span>
          )}
        </div>
      </AnimatedCircularProgressBar>
    </button>
  );
}
