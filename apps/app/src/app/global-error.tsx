"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Global error boundary — catches errors in the root layout.
 * Must render its own <html>/<body> since the root layout may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-white antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md space-y-6 rounded-2xl bg-neutral-900 p-6 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-neutral-400">
                The app encountered an unexpected error. Please try refreshing.
              </p>
            </div>
            {error.message && (
              <div className="rounded-lg border border-red-700 bg-red-900/20 p-2">
                <p className="font-mono text-sm text-red-300">{error.message}</p>
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={() => reset()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-black font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="h-10 w-full rounded-lg border border-neutral-700 text-neutral-300"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
