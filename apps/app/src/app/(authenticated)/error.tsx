"use client";

import { Button } from "@workspace/ui/components/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Error boundary for authenticated route segments.
 * Renders within the authenticated layout (header/footer preserved).
 */
export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white/[0.03] p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-900/30">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Something went wrong</h2>
          <p className="text-sm text-neutral-400">
            An error occurred while loading this page.
          </p>
        </div>
        {error.message && (
          <div className="rounded-lg border border-red-700 bg-red-900/20 p-2">
            <p className="font-mono text-sm text-red-300">{error.message}</p>
          </div>
        )}
        <div className="space-y-2">
          <Button onClick={() => reset()} className="h-11 w-full" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
