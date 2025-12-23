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
    <div className="flex h-full flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-4">
        <BackButton onClick={onBack} />
        <h2 className="text-lg font-semibold text-white">Recipient Address</h2>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        <RecipientAddressInput value={value} onChange={onChange} error={error} />
      </div>

      {/* Confirm Button */}
      <div className="border-t border-gray-800 px-4 py-4">
        <Button
          onClick={onConfirm}
          disabled={!value || !!error}
          className="h-12 w-full rounded-xl bg-purple-600 font-semibold text-white hover:bg-purple-700"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
