/**
 * Error Screen
 * Shown when auth errors occur with retry option
 */

import type { AuthError } from "../../domain/types";

interface ErrorScreenProps {
  error: AuthError;
  retry?: () => void | Promise<void>;
  onClear: () => void;
}

export function ErrorScreen({ error, retry, onClear }: ErrorScreenProps) {
  const handleRetry = async () => {
    if (retry) {
      await retry();
    } else {
      onClear();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/20">
        <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h2 className="text-lg font-semibold text-white">Authentication Error</h2>
      <p className="mt-2 max-w-md text-center text-sm text-gray-400">{error.message}</p>

      {error.code && <p className="mt-1 text-xs text-gray-500">Error code: {error.code}</p>}

      <div className="mt-6 flex gap-3">
        {retry && (
          <button
            onClick={handleRetry}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Retry
          </button>
        )}
        <button
          onClick={onClear}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
