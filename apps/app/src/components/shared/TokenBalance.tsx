/**
 * Token Balance Component
 * Shows available balance with MAX button (no USD value)
 */

interface TokenBalanceProps {
  balance: string;
  assetSymbol: string;
  onMaxClick: () => void;
  disabled?: boolean;
}

export function TokenBalance({
  balance,
  assetSymbol,
  onMaxClick,
  disabled = false,
}: TokenBalanceProps) {
  const formattedBalance = Number.parseFloat(balance).toFixed(4);

  return (
    <div className="mb-2 flex items-center justify-between text-sm sm:text-base">
      <span className="text-gray-400">
        Balance: {formattedBalance} {assetSymbol}
      </span>
      <button
        onClick={onMaxClick}
        className="rounded-lg bg-gray-700 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
      >
        Max
      </button>
    </div>
  );
}
