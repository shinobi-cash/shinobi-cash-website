"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

export const NAV_LINKS = [
  { label: "Notes", href: "/notes" },
  { label: "Deposit", href: "/deposit" },
  { label: "Withdraw", href: "/withdraw" },
] as const;

export type NavLink = (typeof NAV_LINKS)[number];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 rounded-lg bg-white/[0.04] p-1">
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-all",
              isActive
                ? "bg-white/10 text-white shadow-sm"
                : "text-neutral-400 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
