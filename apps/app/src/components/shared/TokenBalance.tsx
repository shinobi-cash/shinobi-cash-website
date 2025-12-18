/**
 * Token Balance Component
 * Shows available balance with USD value and MAX button
 */

interface TokenBalanceProps {
  balance: string;
  usdValue?: string;
  assetSymbol: string;
  onMaxClick: () => void;
  disabled?: boolean;
}

export function TokenBalance({
  balance,
  usdValue,
  assetSymbol,
  onMaxClick,
  disabled = false,
}: TokenBalanceProps) {
  const formattedBalance = Number.parseFloat(balance).toFixed(4);
  const displayUsd = usdValue ? `$${Number.parseFloat(usdValue).toFixed(2)}` : "$0.00";

  return (
    <div className="flex items-center justify-between text-sm sm:text-base mb-2">
      <span className="text-gray-400">{displayUsd}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">
          {formattedBalance} {assetSymbol}
        </span>
        <button
          onClick={onMaxClick}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled}
        >
          Max
        </button>
      </div>
    </div>
  );
}
