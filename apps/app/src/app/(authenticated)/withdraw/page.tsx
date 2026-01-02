"use client";

import { useRouter } from "next/navigation";
import { useNotesController } from "@/features/notes";
import { WithdrawalForm } from "@/features/withdraw";

export default function WithdrawPage() {
  const router = useRouter();
  const notesController = useNotesController();

  const handleTransactionSuccess = () => {
    // Refresh notes after successful withdrawal
    notesController.refresh();
    // Navigate back to notes view
    router.push("/notes");
  };

  return (
    <div className="h-full overflow-y-auto">
      <WithdrawalForm onTransactionSuccess={handleTransactionSuccess} />
    </div>
  );
}
