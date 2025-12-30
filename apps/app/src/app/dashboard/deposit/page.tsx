"use client";

import { useRouter } from "next/navigation";
import { useNotesController } from "@/features/notes";
import { DepositForm } from "@/features/deposit";

export default function DepositPage() {
  const router = useRouter();
  const notesController = useNotesController();

  const handleTransactionSuccess = () => {
    // Refresh notes after successful deposit
    notesController.refresh();
    // Navigate back to notes view
    router.push("/dashboard");
  };

  const handleBack = () => {
    router.push("/dashboard");
  };

  return (
    <DepositForm
      asset={{ symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" }}
      onTransactionSuccess={handleTransactionSuccess}
      onBack={handleBack}
    />
  );
}
