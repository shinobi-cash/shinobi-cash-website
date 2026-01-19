"use client";

import { ProfileMenu } from "@/components/auth/ProfileMenu";
import AppLogo from "../AppLogo";

interface HeaderProps {
  rightSlot?: React.ReactNode;
}

export function Header({ rightSlot }: HeaderProps) {
  return (
    <header className="mx-auto flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-3 backdrop-blur-sm sm:rounded-2xl sm:px-6 lg:px-8">
      <div className="flex gap-6">
        <AppLogo />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        {rightSlot ?? <ProfileMenu />}
      </div>
    </header>
  );
}
