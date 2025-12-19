/**
 * Recipient Address Input Screen Component
 * Full-screen view for entering recipient address
 */

import { BackButton } from "../ui/back-button";
import { RecipientAddressInput } from "./RecipientAddressInput";
import { Button } from "@workspace/ui/components/button";

interface RecipientAddressInputScreenProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onBack: () => void;
  onConfirm: () => void;
}

export function RecipientAddressInputScreen({
  value,
  onChange,
  error,
  onBack,
  onConfirm,
}: RecipientAddressInputScreenProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <BackButton onClick={onBack} />
        <h2 className="text-lg font-semibold text-white">Recipient Address</h2>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        <RecipientAddressInput
          value={value}
          onChange={onChange}
          error={error}
        />
      </div>

      {/* Confirm Button */}
      <div className="px-4 py-4 border-t border-gray-800">
        <Button
          onClick={onConfirm}
          disabled={!value || !!error}
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
