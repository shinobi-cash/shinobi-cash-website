/**
 * AmountInput Component
 * Large numeric input with validation
 * Extracted core logic from TokenAmountInput
 */

import { cn } from "@workspace/ui/lib/utils";

interface AmountInputProps {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function AmountInput({
  value,
  onChange,
  disabled = false,
  placeholder = "0",
  className,
}: AmountInputProps) {
  const handleChange = (newValue: string) => {
    if (!onChange) return;

    // Allow only numbers and single decimal point
    const numericRegex = /^[0-9]*\.?[0-9]*$/;
    if (newValue === "" || numericRegex.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "min-w-0 flex-1 border-none bg-transparent text-right text-3xl font-semibold",
        "text-white placeholder:text-white",
        "focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
    />
  );
}
