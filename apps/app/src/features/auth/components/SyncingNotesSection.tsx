/**
 * Syncing Notes Section
 * Handles initial note discovery and synchronization
 * @file features/auth/components/SyncingNotesSection.tsx
 */

import { useAuth } from "@/contexts/AuthContext";
import { noteDiscoveryService } from "@/lib/services/NoteDiscoveryService";
import { CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { Button } from "@workspace/ui/components/button";

interface SyncingNotesSectionProps {
  onSyncComplete: () => void;
}

export function SyncingNotesSection({ onSyncComplete }: SyncingNotesSectionProps) {
  const { publicKey, accountKey } = useAuth();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Use pre-configured singleton service
  const discoveryService = noteDiscoveryService;

  const startSync = useCallback(async () => {
    if (!publicKey || !accountKey) return;

    setStatus("loading");
    setError(null);

    // cancel previous run
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      await discoveryService.discoverNotes(publicKey, SHINOBI_CASH_ETH_POOL.address, accountKey, {
        signal: abortRef.current.signal,
      });
      setStatus("success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // intentional cancel (cleanup/retry)
      }
      console.error("Sync error:", err);
      setError(err instanceof Error ? err.message : "Failed to sync notes");
      setStatus("error");
    }
  }, [publicKey, accountKey, discoveryService]);

  // Run sync once when keys available
  useEffect(() => {
    if (publicKey && accountKey && status === "idle") {
      startSync();
    }
  }, [publicKey, accountKey, status, startSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const handleRetry = useCallback(() => {
    setStatus("idle"); // will trigger startSync via effect
  }, []);

  // ----- UI states with integrated footer -----

  if (status === "success") {
    return (
      <>
        <div className="flex-1 space-y-4 px-4 py-6 text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <div className="mb-6 text-center">
            <h3 className="text-app-primary mb-2 text-lg font-semibold">Welcome to Shinobi!</h3>
            <p className="text-app-secondary text-sm">Your account is ready to use</p>
          </div>
        </div>

        <div className="border-t border-gray-800 px-4 py-4">
          <Button
            variant="default"
            onClick={onSyncComplete}
            className="min-h-12 w-full rounded-2xl py-3 text-base font-medium"
            size="lg"
          >
            Get Started
          </Button>
        </div>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <div className="flex-1 space-y-4 px-4 py-6 text-center">
          <div className="flex justify-center">
            <RefreshCw className="h-16 w-16 text-red-500" />
          </div>
          <div>
            <h3 className="text-app-primary mb-2 text-lg font-semibold">Sync Failed</h3>
            <p className="text-app-secondary mb-4 text-sm">{error}</p>
          </div>
        </div>

        <div className="border-t border-gray-800 px-4 py-4">
          <Button
            variant="default"
            onClick={handleRetry}
            className="min-h-12 w-full rounded-2xl py-3 text-base font-medium"
            size="lg"
          >
            Try Again
          </Button>
        </div>
      </>
    );
  }

  // default: loading - no footer
  return (
    <div className="flex-1 space-y-6 px-4 py-6 text-center">
      <div className="flex justify-center">
        <Loader2 className="text-app-primary h-16 w-16 animate-spin" />
      </div>
      <div>
        <h3 className="text-app-primary mb-2 text-lg font-semibold">Syncing Your Notes</h3>
        <p className="text-app-secondary mb-2 text-sm">
          Discovering your privacy notes from the blockchain...
        </p>
        <p className="text-app-tertiary mb-4 text-xs">This may take a few minutes</p>
      </div>
    </div>
  );
}
