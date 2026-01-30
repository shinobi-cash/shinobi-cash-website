"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ProfileMenu } from "@/components/auth/ProfileMenu";

interface HeaderProps {
  rightSlot?: React.ReactNode;
}

export function Header({ rightSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/Shinobi.Cash-icon.svg"
            alt="Shinobi Cash"
            width={32}
            height={32}
            className="h-7 w-7 sm:h-8 sm:w-8"
            priority
          />
          <div className="flex flex-col">
            <span className="text-base font-semibold text-white sm:text-lg">Shinobi Cash</span>
            <span className="text-[10px] text-neutral-400 sm:text-xs">Privacy App</span>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {rightSlot ?? <ProfileMenu />}

          {/* Mobile: Menu dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white sm:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border bg-background w-48 p-1">
              <DropdownMenuItem asChild>
                <a
                  href="https://testnet-explorer.shinobi.cash"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full cursor-pointer"
                >
                  Explorer
                </a>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <a href="#" className="w-full cursor-pointer">
                  Documentation
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#" className="w-full cursor-pointer">
                  Privacy Policy
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#" className="w-full cursor-pointer">
                  Terms of Service
                </a>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <a href="#" target="_blank" rel="noopener noreferrer" className="w-full cursor-pointer">
                  GitHub
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
