"use client";

import { DepositForm } from "@/components/deposit/DepositForm";

export default function DepositPage() {
  return (
    <div className="h-full overflow-y-auto">
      <DepositForm asset={{ symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" }} />
    </div>
  );
}
