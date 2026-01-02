/**
 * Token Amount Input Component
 * Uses composition pattern - children are rendered on the right side
 */

import { ReactNode } from "react";

interface TokenAmountInputProps {
  amount: string;
  onAmountChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  children?: ReactNode;
  className?: string;
}

export function TokenAmountInput({
  amount,
  onAmountChange,
  disabled = false,
  placeholder = "0",
  children,
  className = "",
}: TokenAmountInputProps) {
  const handleChange = (value: string) => {
    // Allow only numbers and single decimal point
    const numericRegex = /^[0-9]*\.?[0-9]*$/;
    if (value === "" || numericRegex.test(value)) {
      onAmountChange(value);
    }
  };

  return (
    <div
      className={`flex w-full items-center gap-3 overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50 p-3 ${className}`}
    >
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-none bg-transparent px-0 py-2 text-3xl font-semibold text-white placeholder:text-gray-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 sm:text-4xl md:text-5xl"
        disabled={disabled}
      />

      {/* Right slot - composable via children */}
      {children}
    </div>
  );
}
