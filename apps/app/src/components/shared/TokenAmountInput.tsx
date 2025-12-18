/**
 * Token Amount Input Component
 */

import { ReactNode } from "react";

interface TokenAmountInputProps {
  amount: string;
  onAmountChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  rightElement?: ReactNode;
  className?: string;
}

export function TokenAmountInput({
  amount,
  onAmountChange,
  disabled = false,
  placeholder = "0",
  readOnly = false,
  rightElement,
  className = "",
}: TokenAmountInputProps) {
  return (
    <div className={`flex items-center gap-3 mb-2 w-full overflow-hidden ${className}`}>
      {/* Amount Input */}
      {readOnly ? (
        <div className="flex-1 min-w-0 px-0 py-2 text-white text-5xl font-semibold">
          {amount || "0.0000"}
        </div>
      ) : (
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-0 py-2 bg-transparent border-none text-white text-5xl font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          disabled={disabled}
        />
      )}

      {/* Right Element - flexible slot for any component */}
      {rightElement}
    </div>
  );
}
