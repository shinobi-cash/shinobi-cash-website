"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const tabs = [
  { label: "Notes", href: "/dashboard" },
  { label: "Deposit", href: "/dashboard/deposit" },
  { label: "Withdraw", href: "/dashboard/withdraw" },
] as const;

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 rounded-lg bg-gray-800/50 p-1">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-center transition-all",
              isActive
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
