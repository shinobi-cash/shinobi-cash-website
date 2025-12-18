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
      <label className="text-sm font-medium text-gray-400 mb-3 block">Recipient Address</label>
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-600 transition-colors pr-20"
            disabled={disabled}
          />
          <button
            onClick={handlePaste}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
          >
            Paste
          </button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  );
}
