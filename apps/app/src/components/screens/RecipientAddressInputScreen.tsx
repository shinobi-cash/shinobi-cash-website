/**
 * Recipient Address Input Screen Component
 * Full-screen view for entering recipient address
 */

import { RecipientAddressInput } from "@/components/withdraw/RecipientAddressInput";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";

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
    <ScreenLayout
      containerClassName="h-[600px]"
      header={<ScreenHeader title="Recipient Address" onBack={onBack} />}
      footer={
        <Button
          onClick={onConfirm}
          disabled={!value || !!error}
          className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
          size="lg"
        >
          Confirm
        </Button>
      }
    >
      <RecipientAddressInput value={value} onChange={onChange} error={error} />
    </ScreenLayout>
  );
}
