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
    <div className={`mb-2 flex w-full items-center gap-3 overflow-hidden ${className}`}>
      {/* Amount Input */}
      {readOnly ? (
        <div className="min-w-0 flex-1 px-0 py-2 text-5xl font-semibold text-white">
          {amount || "0.0000"}
        </div>
      ) : (
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-none bg-transparent px-0 py-2 text-5xl font-semibold text-white [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          disabled={disabled}
        />
      )}

      {/* Right Element - flexible slot for any component */}
      {rightElement}
    </div>
  );
}
