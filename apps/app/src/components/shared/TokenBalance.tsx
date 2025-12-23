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
    <div className="mb-2 flex items-center justify-between text-sm sm:text-base">
      <span className="text-gray-400">{displayUsd}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">
          {formattedBalance} {assetSymbol}
        </span>
        <button
          onClick={onMaxClick}
          className="rounded-lg bg-gray-700 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        >
          Max
        </button>
      </div>
    </div>
  );
}
