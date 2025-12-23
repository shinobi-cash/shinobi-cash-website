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
      <label className="mb-3 block text-sm font-medium text-gray-400">Recipient Address</label>
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 pr-20 text-sm text-white transition-colors placeholder:text-gray-500 focus:border-purple-600 focus:outline-none"
            disabled={disabled}
          />
          <button
            onClick={handlePaste}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
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
