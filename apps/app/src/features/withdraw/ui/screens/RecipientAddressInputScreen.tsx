/**
 * Recipient Address Input Screen Component
 * Full-screen view for entering recipient address
 */

import { RecipientAddressInput } from "../components/RecipientAddressInput";
import { Button } from "@workspace/ui/components/button";
import { ChevronLeft } from "lucide-react";

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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className={`hover:bg-app-surface-hover h-8 w-8 p-0 transition-colors duration-200`}
          aria-label="Go back"
        >
          <ChevronLeft className="text-app-secondary h-4 w-4" />
        </Button>
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
