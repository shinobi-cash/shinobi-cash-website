/**
 * Unauthenticated Screen
 * Shown when no session exists - prompts user to sign in with wallet
 * Simplified: Wallet is the ONLY authentication method
 */

import { Wallet } from "lucide-react";

interface UnauthenticatedProps {
  onSignInWithWallet: () => void;
}

export function Unauthenticated({ onSignInWithWallet }: UnauthenticatedProps) {
  return (
    <div className="flex flex-col p-6">
      <button
        onClick={onSignInWithWallet}
        className="flex w-full flex-col items-start rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-left hover:bg-gray-800"
      >
        <div className="mb-2 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-orange-500" />
          <span className="font-medium text-white">Sign in with Wallet</span>
        </div>
        <p className="text-xs text-gray-400">Sign with your wallet to access your account.</p>
      </button>
    </div>
  );
}
