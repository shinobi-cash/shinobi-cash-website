/**
 * Accounts Detected Screen
 * Shows list of available accounts for selection
 */

import type { AccountIndex, AuthMethod } from "../../domain/types";

interface AccountsDetectedScreenProps {
  accounts: AccountIndex[];
  onSelectAccount: (accountId: string, method: AuthMethod) => void;
  onCreateNew: () => void;
}

export function AccountsDetectedScreen({
  accounts,
  onSelectAccount,
  onCreateNew,
}: AccountsDetectedScreenProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getMethodIcon = (method: AuthMethod) => {
    if (method === "passkey") {
      return (
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
      );
    }
    return (
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
    );
  };

  return (
    <div className="flex flex-col p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Sign In</h2>
        <p className="mt-2 text-sm text-gray-400">
          Select an account to continue. Your credentials never leave your device.
        </p>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => onSelectAccount(account.id, account.type)}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-left hover:bg-gray-800"
          >
            <div className="flex-shrink-0">{getMethodIcon(account.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{account.id}</p>
              <p className="text-xs text-gray-400">
                {account.type === "passkey" ? "Passkey" : "Wallet"} • Created{" "}
                {formatDate(account.createdAt)}
              </p>
            </div>
            <svg
              className="h-5 w-5 flex-shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        ))}
      </div>

      <div className="mt-6 border-t border-gray-800 pt-6">
        <button
          onClick={onCreateNew}
          className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create New Account
        </button>
      </div>
    </div>
  );
}
