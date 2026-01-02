"use client";

import Image from "next/image";
import Link from "next/link";
import { ProfileMenu } from "@/components/ProfileMenu";

export function Header() {
  return (
    <>
      <header className="mx-auto flex items-center justify-between rounded-xl border border-gray-800 bg-black/50 px-4 py-3 backdrop-blur-sm sm:rounded-2xl sm:px-6 lg:px-8">
        {/* Logo and Navigation */}
        <div className="flex gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            {/* Mobile icon */}
            <Image
              src="/Shinobi.Cash-white-text.png"
              alt="Shinobi Cash"
              width={144}
              height={32}
              className="block h-8 w-auto md:hidden"
              priority
            />

            {/* Desktop logo */}
            <Image
              src="/Shinobi.Cash-white-text.png"
              alt="Shinobi Cash"
              width={180}
              height={40}
              className="hidden h-10 w-auto md:block"
              priority
            />
          </Link>
        </div>

        {/* Actions - Right */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Account Menu */}
          <ProfileMenu />
        </div>
      </header>
    </>
  );
}
