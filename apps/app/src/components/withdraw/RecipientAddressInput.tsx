/**
 * Recipient Address Input Component
 * Input field for recipient address with paste functionality
 */

interface RecipientAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function RecipientAddressInput({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = "Address or ENS",
}: RecipientAddressInputProps) {
  const handlePaste = async () => {
    if (navigator.clipboard) {
      try {
        const text = await navigator.clipboard.readText();
        onChange(text);
      } catch (err) {
        console.error("Failed to read clipboard:", err);
      }
    }
  };

  return (
    <div>
      <label className="text-muted-foreground mb-3 block text-sm font-medium">
        Recipient Address
      </label>
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 pr-20 text-sm transition-colors focus:border-purple-600 focus:outline-none"
            disabled={disabled}
          />
          <button
            onClick={handlePaste}
            className="bg-muted text-foreground hover:bg-muted/80 absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
          >
            Paste
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
