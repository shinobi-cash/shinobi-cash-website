"use client";

import { useRouter } from "next/navigation";
import { DepositForm } from "@/features/deposit/ui/components/DepositForm";

export default function DepositPage() {
  const router = useRouter();

  const handleTransactionSuccess = () => {
    // Navigate back to notes view
    router.push("/notes");
  };

  return (
    <div className="h-full overflow-y-auto">
      <DepositForm
        asset={{ symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" }}
        onTransactionSuccess={handleTransactionSuccess}
      />
    </div>
  );
}
