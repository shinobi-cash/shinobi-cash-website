"use client";

import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";

interface RecipientAddressInputScreenProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onClose: () => void;
}

export function RecipientAddressInputScreen({
  value,
  onChange,
  error,
  onClose,
}: RecipientAddressInputScreenProps) {
  return (
    <ScreenLayout
      containerClassName="h-[600px]"
      header={<ScreenHeader title="Recipient Address" onBack={onClose} />}
      footer={
        <Button
          onClick={onClose}
          disabled={!value || !!error}
          className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
          size="lg"
        >
          Close
        </Button>
      }
      contentClassName="px-6 py-4"
    >
      <div>
        <label className="mb-3 block text-sm font-medium text-muted-foreground">Recipient Address</label>
        <div className="space-y-3">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Address or ENS"
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-blue-600 focus:outline-none"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </ScreenLayout>
  );
}
