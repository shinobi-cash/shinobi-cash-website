"use client";

import { ExternalLink } from "lucide-react";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import AppLogo from "../AppLogo";

interface HeaderProps {
  rightSlot?: React.ReactNode;
}

export function Header({ rightSlot }: HeaderProps) {
  return (
    <header className="border-white/10 bg-black/60 mx-auto flex items-center justify-between rounded-xl border px-4 py-3 backdrop-blur sm:rounded-2xl sm:px-6 lg:px-8">
      <div className="flex gap-6">
        <AppLogo />
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://testnet-explorer.shinobi.cash"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          Explorer
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {rightSlot ?? <ProfileMenu />}
      </div>
    </header>
  );
}
