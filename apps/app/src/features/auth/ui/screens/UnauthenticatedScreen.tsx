/**
 * Unauthenticated Screen
 * Shown when no session exists - prompts user to sign in with wallet
 * Simplified: Wallet is the ONLY authentication method
 */

interface UnauthenticatedScreenProps {
  onSignInWithWallet: () => void;
}

export function UnauthenticatedScreen({ onSignInWithWallet }: UnauthenticatedScreenProps) {
  return (
    <div className="flex flex-col p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Sign In</h2>
        <p className="mt-2 text-sm text-gray-400">
          Connect your wallet to access your account. Your keys never leave your device.
        </p>
      </div>

      <button
        onClick={onSignInWithWallet}
        className="flex w-full flex-col items-start rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-left hover:bg-gray-800"
      >
        <div className="mb-2 flex items-center gap-2">
          <svg
            className="h-5 w-5 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <span className="font-medium text-white">Sign in with Wallet</span>
        </div>
        <p className="text-xs text-gray-400">
          Sign with your wallet to access your account. You can enable Quick Unlock after signing in
          for faster access.
        </p>
      </button>
    </div>
  );
}
