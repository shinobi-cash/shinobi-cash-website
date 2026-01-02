"use client";

import Image from "next/image";
import Link from "next/link";
import { Settings, Menu } from "lucide-react";
import { useState } from "react";
import { AddPasskeyModal } from "@/features/auth/components/AddPasskeyModal";
import { RemovePasskeyModal } from "@/features/auth/components/RemovePasskeyModal";
import { SettingMenu } from "@/components/SettingMenu";

export function Header() {
  const [showAddPasskeyModal, setShowAddPasskeyModal] = useState(false);
  const [showRemovePasskeyModal, setShowRemovePasskeyModal] = useState(false);

  const handleAddPasskey = () => {
    setShowAddPasskeyModal(true);
  };

  const handleRemovePasskey = () => {
    setShowRemovePasskeyModal(true);
  };

  return (
    <>
      <AddPasskeyModal open={showAddPasskeyModal} onOpenChange={setShowAddPasskeyModal} />
      <RemovePasskeyModal open={showRemovePasskeyModal} onOpenChange={setShowRemovePasskeyModal} />
      <header className="mx-auto flex items-center justify-between rounded-xl border border-gray-800 bg-black/50 px-4 py-3 backdrop-blur-sm sm:rounded-2xl sm:px-6 lg:px-8">
        {/* Logo and Navigation */}
        <div className="flex gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            {/* Mobile icon */}
            <Image
              src="/Shinobi.Cash-white-text.png"
              alt="Shinobi Cash"
              width={128}
              height={32}
              className="block h-8 w-auto md:hidden"
              priority
            />

            {/* Desktop logo */}
            <Image
              src="/Shinobi.Cash-white-text.png"
              alt="Shinobi Cash"
              width={160}
              height={40}
              className="hidden h-10 w-auto md:block lg:h-12"
              priority
            />
          </Link>
        </div>

        {/* Actions - Right */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Account Menu */}
          <SettingMenu onAddPasskey={handleAddPasskey} onRemovePasskey={handleRemovePasskey}>
            <button
              className="rounded-lg p-2 transition-colors hover:bg-gray-800"
              aria-label="Account Menu"
            >
              <Settings className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </SettingMenu>

          {/* Mobile: Menu Icon */}
          <button
            className="rounded-lg p-2 transition-colors hover:bg-gray-800 md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </header>
    </>
  );
}
