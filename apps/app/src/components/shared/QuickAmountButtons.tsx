/**
 * QuickAmountButtons Component
 * Row of percentage buttons: 25%, 50%, Max
 */

import { cn } from "@workspace/ui/lib/utils";

interface QuickAmountButtonsProps {
  onSelect: (percentage: number) => void;
  disabled?: boolean;
}

export function QuickAmountButtons({ onSelect, disabled = false }: QuickAmountButtonsProps) {
  const buttons = [
    { label: "25%", value: 0.25 },
    { label: "50%", value: 0.5 },
    { label: "Max", value: 1 },
  ];

  return (
    <div className="flex items-center justify-end gap-1">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={() => onSelect(btn.value)}
          disabled={disabled}
          className={cn(
            "cursor-pointer rounded-lg px-3 py-1 text-sm font-medium transition-colors",
            "text-neutral-400 hover:bg-white/[0.08] hover:text-white",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
          )}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
