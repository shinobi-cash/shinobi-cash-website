"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatedCircularProgressBar } from "@workspace/ui/components/animated-circular-progress-bar";
import { RotateCw } from "lucide-react";
import { useAutoSync } from "@/hooks/useAutoSync";

interface SyncIndicatorProps {
  onSync: () => void | Promise<void>;
  autoSyncInterval?: number; // in seconds, default 10
}

export function SyncIndicator({ onSync, autoSyncInterval = 10 }: SyncIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState(autoSyncInterval);
  const [isSyncing, setIsSyncing] = useState(false);
  const { autoSyncEnabled } = useAutoSync();

  const handleSync = useCallback(async () => {
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
  }, [isSyncing, onSync, autoSyncInterval]);

  // Reset timer when auto-sync is toggled
  useEffect(() => {
    setTimeLeft(autoSyncInterval);
  }, [autoSyncEnabled, autoSyncInterval]);

  // Countdown timer - only run if auto-sync is enabled
  useEffect(() => {
    if (!autoSyncEnabled || isSyncing) return;

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
  }, [autoSyncEnabled, isSyncing, autoSyncInterval, handleSync]);

  // Calculate progress (countdown from 100% to 0%)
  const progress = (timeLeft / autoSyncInterval) * 100;

  // When auto-sync is disabled, show simple refresh button
  if (!autoSyncEnabled) {
    return (
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="group relative cursor-pointer rounded-lg p-2 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={isSyncing ? "Syncing..." : "Sync now"}
        title="Manual sync only (auto-sync disabled)"
      >
        <RotateCw
          className={`h-4 w-4 text-gray-400 ${isSyncing ? "animate-spin" : "group-hover:text-white"}`}
        />
      </button>
    );
  }

  // When auto-sync is enabled, show countdown progress
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
        gaugePrimaryColor="oklch(0.705 0.213 47.604)" // Primary accent color
        gaugeSecondaryColor="oklch(0.269 0 0)" // Muted border color
        className="size-8 transition-opacity group-hover:opacity-80"
      >
        <div className="flex flex-col items-center justify-center">
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
