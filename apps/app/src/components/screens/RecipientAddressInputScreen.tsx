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
      header={<ScreenHeader title="Recipient Address" onBack={onBack} />}
      footer={
        <Button
          onClick={onConfirm}
          disabled={!value || !!error}
          className="h-12 w-full rounded-xl bg-purple-600 font-semibold text-white hover:bg-purple-700"
        >
          Confirm
        </Button>
      }
    >
      <RecipientAddressInput value={value} onChange={onChange} error={error} />
    </ScreenLayout>
  );
}
