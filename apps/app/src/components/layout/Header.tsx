"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ProfileMenu } from "@/components/auth/ProfileMenu";

interface HeaderProps {
  rightSlot?: React.ReactNode;
}

export function Header({ rightSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/Shinobi.Cash-icon.svg"
            alt="Shinobi Cash"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-white">Shinobi Cash</span>
            <span className="text-xs text-neutral-400">Privacy App</span>
          </div>
        </Link>

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
      </div>
    </header>
  );
}
