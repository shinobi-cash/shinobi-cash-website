/**
 * Creating Account Screen
 * Shown during account creation process
 */

import type { AuthMethod } from "../../domain/types";

interface CreatingAccountScreenProps {
  method: AuthMethod;
}

export function CreatingAccountScreen({ method }: CreatingAccountScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-orange-500" />
      <h2 className="text-lg font-semibold text-white">Creating Account...</h2>
      <p className="mt-2 text-center text-sm text-gray-400">
        {method === "passkey"
          ? "Setting up your passkey. Please follow the prompts on your device."
          : "Creating your wallet account. Please sign the message in your wallet."}
      </p>
    </div>
  );
}
