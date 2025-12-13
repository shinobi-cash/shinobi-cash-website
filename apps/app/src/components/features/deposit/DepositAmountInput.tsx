import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatEther } from "viem";

interface DepositAmountInputProps {
  amount: string;
  onAmountChange: (value: string) => void;
  asset: { symbol: string; name: string; icon: string };
  balance: bigint | null;
  error?: string;
  quickAmounts?: Array<{ value: string; label: string }>;
}

const DEFAULT_QUICK_AMOUNTS = [
  { value: "0.01", label: "0.01 ETH" },
  { value: "0.05", label: "0.05 ETH" },
  { value: "0.1", label: "0.1 ETH" },
  { value: "0.5", label: "0.5 ETH" },
];

export const DepositAmountInput = memo(({
  amount,
  onAmountChange,
  asset,
  balance,
  error,
  quickAmounts = DEFAULT_QUICK_AMOUNTS,
}: DepositAmountInputProps) => {
  const handleQuickAmount = useCallback((quickAmount: string) => {
    onAmountChange(quickAmount);
  }, [onAmountChange]);

  return (
    <>
      {/* Amount Input */}
      <div className="mb-6">
        <div className="text-center mb-3">
          <input
            type="text"
            id="amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className={`text-3xl font-light text-center bg-transparent border-none outline-none placeholder-app-secondary w-full ${
              error ? "text-red-500" : "text-app-primary"
            }`}
          />
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <img src={asset.icon} alt={asset.symbol} className="w-4 h-4" />
            </div>
            <p className="text-base text-app-primary">{asset.symbol}</p>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 justify-center">
          {quickAmounts.map((deposit) => (
            <Button
              key={deposit.value}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(deposit.value)}
              className="rounded-full px-2 py-1 text-xs"
            >
              {deposit.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-app-card rounded-xl p-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-app-secondary font-bold">Available</span>
          <span className="text-app-primary font-medium">
            {balance !== null
              ? `${Number.parseFloat(formatEther(balance)).toFixed(4)} ${asset.symbol}`
              : `0.000 ${asset.symbol}`}
          </span>
        </div>
      </div>
    </>
  );
});

DepositAmountInput.displayName = 'DepositAmountInput';
