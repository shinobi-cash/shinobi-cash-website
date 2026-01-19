"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

export const DASHBOARD_TABS = [
  { label: "Notes", href: "/notes" },
  { label: "Deposit", href: "/deposit" },
  { label: "Withdraw", href: "/withdraw" },
  { label: "Activity", href: "/activity" },
] as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 rounded-lg bg-gray-800/50 p-1">
      {DASHBOARD_TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
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
