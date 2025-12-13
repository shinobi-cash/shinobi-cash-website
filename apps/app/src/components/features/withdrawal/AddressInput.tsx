import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { memo } from "react";
import { Input } from "../../ui/input";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string;
}

export const AddressInput = memo(({ value, onChange, error }: AddressInputProps) => {
  const isInputVisible = !value || !!error;

  const handleClear = () => onChange("");

  return (
    <>
      {isInputVisible ? (
        <Input
          id="to-address"
          type="text"
          placeholder="Enter public address (0x)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("font-mono text-xs h-16 px-4 py-3", error && "border-destructive focus:border-destructive")}
          autoFocus={false}
        />
      ) : (
        <div className="flex items-center gap-2 bg-app-surface border border-app rounded-xl px-4 py-3 h-16">
          <input id="to-address" readOnly value={value} className="sr-only" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono text-app-primary truncate">{value}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="w-6 h-6 flex items-center justify-center rounded-xl hover:bg-app-surface-hover transition-colors"
            aria-label="Clear recipient address"
          >
            <X className="w-4 h-4 text-app-secondary" />
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
    </>
  );
});
