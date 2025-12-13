import type { Note } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { formatEthAmount } from "@/utils/formatters";
import { memo } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string;
  selectedNote: Note;
  asset: { symbol: string; icon: string };
  onMaxClick: () => void;
}

export const AmountInput = memo(({ value, onChange, error, selectedNote, asset, onMaxClick }: AmountInputProps) => {
  return (
    <>
      <div
        className={cn(
          "relative border border-app rounded-xl bg-app-surface p-4 h-16 flex items-center",
          error && value.trim().length > 0 && "border-destructive",
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <img src={asset.icon} alt={asset.symbol} className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-app-primary">{asset.symbol}</p>
            </div>
          </div>
          <div className="text-right flex-1 max-w-[120px]">
            <Input
              id="amount"
              type="text"
              placeholder="0"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={cn(
                "text-right text-lg font-medium border-none bg-transparent p-0 h-auto focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-none shadow-none",
                error && value.trim().length > 0 ? "text-red-500" : "text-app-primary",
              )}
              autoFocus={true}
            />
            <p className="text-xs text-app-tertiary">$0.00</p>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-app-secondary">
          Balance:{" "}
          <span className="text-app-primary font-medium">
            {formatEthAmount(selectedNote.amount, { maxDecimals: 6 })} {asset.symbol}
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={onMaxClick} className="rounded-xl px-2 py-1 text-xs h-6">
          MAX
        </Button>
      </div>
    </>
  );
});
