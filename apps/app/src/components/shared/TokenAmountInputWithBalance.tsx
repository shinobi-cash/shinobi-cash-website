/**
 * Token Amount Input With Balance
 * Unified component combining amount input, USD value display, and balance info
 * Uses composition pattern - children are passed to TokenAmountInput
 */

import { TokenAmountInput } from "./TokenAmountInput";
import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount } from "@/utils/formatters";
import type { TokenSymbol } from "@/lib/prices/types";
import type { ReactNode } from "react";

interface TokenAmountInputWithBalanceProps {
  /** Current input value */
  amount: string;
  /** Amount change handler */
  onAmountChange: (value: string) => void;
  /** Available balance */
  balance: string;
  /** Asset symbol */
  assetSymbol: string;
  /** Max button click handler */
  onMaxClick: () => void;
  /** Children (e.g., token selector) - rendered on the right */
  children?: ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
}

export function TokenAmountInputWithBalance({
  amount,
  onAmountChange,
  balance,
  assetSymbol,
  onMaxClick,
  children,
  disabled = false,
  readOnly = false,
}: TokenAmountInputWithBalanceProps) {
  const { usdPrice, isLoading } = usePriceData(assetSymbol as TokenSymbol);

  // Calculate USD value of entered amount
  const amountAsNumber = Number.parseFloat(amount);
  const hasValidAmount = amount && !Number.isNaN(amountAsNumber) && amountAsNumber > 0;
  const amountUsd = usdPrice && hasValidAmount ? amountAsNumber * usdPrice : null;

  // Format balance
  const formattedBalance = Number.parseFloat(balance).toFixed(4);
  const hasBalance = Number.parseFloat(balance) > 0;

  return (
    <div className="space-y-2">
      {/* Token Amount Input with composable right slot */}
      <TokenAmountInput
        amount={amount}
        onAmountChange={onAmountChange}
        disabled={disabled}
        readOnly={readOnly}
      >
        {children}
      </TokenAmountInput>

      {/* USD Value (left) + Balance & Max Button (right) - Same line */}
      {!readOnly && (
        <div className="flex items-center justify-between text-sm">
          {/* USD Value */}
          <span className="text-gray-400">
            {hasValidAmount && (isLoading ? "Loading price..." : amountUsd ? `≈ ${formatUsdAmount(amountUsd)}` : "")}
          </span>

          {/* Balance and Max Button */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">
              Balance: {formattedBalance} {assetSymbol}
            </span>
            <button
              onClick={onMaxClick}
              className="rounded-lg bg-gray-700 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled || !hasBalance}
            >
              Max
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
