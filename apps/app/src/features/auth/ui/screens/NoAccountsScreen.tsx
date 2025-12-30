/**
 * No Accounts Screen
 * Shown when no accounts exist - prompts user to create one
 */

import type { AuthMethod } from "../../domain/types";

interface NoAccountsScreenProps {
  onCreateAccount: (method: AuthMethod) => void;
}

export function NoAccountsScreen({ onCreateAccount }: NoAccountsScreenProps) {
  return (
    <div className="flex flex-col p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Get Started</h2>
        <p className="mt-2 text-sm text-gray-400">
          Create your account to start using Shinobi Cash. Your keys never leave your device.
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onCreateAccount("passkey")}
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <span className="font-medium text-white">Create with Passkey</span>
          </div>
          <p className="text-xs text-gray-400">
            Quick sign-in with biometrics or device PIN. Recommended for most users.
          </p>
        </button>

        <button
          onClick={() => onCreateAccount("wallet")}
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
            <span className="font-medium text-white">Create with Wallet</span>
          </div>
          <p className="text-xs text-gray-400">
            Sign with your connected wallet. You'll need to sign each time you access.
          </p>
        </button>
      </div>
    </div>
  );
}
