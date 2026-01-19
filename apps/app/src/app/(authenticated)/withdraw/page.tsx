"use client";

import { useRouter } from "next/navigation";
import { WithdrawalForm } from "@/components/withdraw/WithdrawalForm";

export default function WithdrawPage() {
  const router = useRouter();

  const handleTransactionSuccess = () => {
    // Navigate back to notes view
    router.push("/notes");
  };

  return (
    <div className="h-full overflow-y-auto">
      <WithdrawalForm onTransactionSuccess={handleTransactionSuccess} />
    </div>
  );
}
