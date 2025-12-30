/**
 * Authenticating Screen
 * Shown during authentication process
 */

import type { AuthMethod } from "../../domain/types";

interface AuthenticatingScreenProps {
  method: AuthMethod;
  accountId: string;
}

export function AuthenticatingScreen({ method, accountId }: AuthenticatingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-orange-500" />
      <h2 className="text-lg font-semibold text-white">Signing In...</h2>
      <p className="mt-2 text-center text-sm text-gray-400">
        {method === "passkey"
          ? "Authenticating with your passkey. Please follow the prompts on your device."
          : "Please sign the message in your wallet to continue."}
      </p>
      <p className="mt-1 text-xs text-gray-500">{accountId}</p>
    </div>
  );
}
