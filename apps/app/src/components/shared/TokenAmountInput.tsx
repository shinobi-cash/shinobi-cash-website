/**
 * Token Amount Input Component
 * Compositional component for token amount input with flexible slots
 * Used in both deposit and withdrawal forms
 */

import { ReactNode } from "react";

interface TokenAmountInputProps {
  label?: string;
  labelRight?: ReactNode;
  amount: string;
  onAmountChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  rightElement?: ReactNode;
  className?: string;
}

export function TokenAmountInput({
  label,
  labelRight,
  amount,
  onAmountChange,
  disabled = false,
  placeholder = "0",
  readOnly = false,
  rightElement,
  className = "",
}: TokenAmountInputProps) {
  return (
    <div className={`${className}`}>
      {/* Label Area - flexible for custom content */}
      {(label || labelRight) && (
        <div className="flex items-center justify-between mb-2">
          {label && <label className="text-sm text-gray-400">{label}</label>}
          {labelRight}
        </div>
      )}

      <div className="flex items-center gap-3 mb-2 w-full overflow-hidden">
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
    </div>
  );
}
