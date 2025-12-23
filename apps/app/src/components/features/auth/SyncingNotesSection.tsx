import { useAuth } from "@/contexts/AuthContext";
import { noteDiscoveryService } from "@/lib/services/NoteDiscoveryService";
import { CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

interface SyncingNotesSectionProps {
  onSyncComplete: () => void;
  registerFooterActions?: (
    primary: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null
  ) => void;
}

export function SyncingNotesSection({
  onSyncComplete,
  registerFooterActions,
}: SyncingNotesSectionProps) {
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

  // Register footer actions based on status
  useEffect(() => {
    if (!registerFooterActions) return;
    if (status === "success") {
      registerFooterActions({ label: "Get Started", onClick: onSyncComplete });
      return () => registerFooterActions(null);
    }
    if (status === "error") {
      registerFooterActions({ label: "Try Again", onClick: handleRetry });
      return () => registerFooterActions(null);
    }
    // loading/idle: no primary action
    registerFooterActions(null);
    return () => registerFooterActions(null);
  }, [registerFooterActions, status, onSyncComplete, handleRetry]);

  // ----- UI states -----

  if (status === "success") {
    const baseContent = (
      <>
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <div className="mb-6 text-center">
          <h3 className="text-app-primary mb-2 text-lg font-semibold">Welcome to Shinobi!</h3>
          <p className="text-app-secondary text-sm">Your account is ready to use</p>
        </div>
      </>
    );

    return <div className="space-y-4 text-center">{baseContent}</div>;
  }

  if (status === "error") {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <RefreshCw className="h-16 w-16 text-red-500" />
        </div>
        <div>
          <h3 className="text-app-primary mb-2 text-lg font-semibold">Sync Failed</h3>
          <p className="text-app-secondary mb-4 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // default: loading
  return (
    <div className="space-y-6 text-center">
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
