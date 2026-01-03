"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const tabs = [
  { label: "Notes", href: "/notes" },
  { label: "Deposit", href: "/deposit" },
  { label: "Withdraw", href: "/withdraw" },
  { label: "Activity", href: "/activity" },
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
              "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-all",
              isActive
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
