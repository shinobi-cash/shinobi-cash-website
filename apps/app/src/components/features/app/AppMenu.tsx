/**
 * App Menu Component
 * Hamburger menu for app-wide settings and options
 * Includes wallet connection, settings, about, and other app features
 */

import { useAuth } from "@/contexts/AuthContext";
import { modal } from "@/context";
import { BookOpen, HelpCircle, LogOut, Menu, Settings, WalletIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

export function AppMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Wallet state
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  // Authentication state
  const { isAuthenticated, signOut } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && target && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use capture phase to ensure we catch the event before it's handled by other components
      document.addEventListener("mousedown", handleClickOutside, true);
      document.addEventListener("touchstart", handleClickOutside, true);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside, true);
        document.removeEventListener("touchstart", handleClickOutside, true);
      };
    }
  }, [isOpen]);

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  const handleConnect = () => {
    modal.open();
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          // Blur active element to avoid retaining focus under aria-hidden containers
          const active = document.activeElement as HTMLElement | null;
          if (active && typeof active.blur === "function") active.blur();
          setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => e.preventDefault()}
        aria-label="App menu"
        className="flex items-center gap-1 p-2 hover:bg-app-surface-hover rounded-lg active:scale-95 transition-all"
      >
        <Menu className="w-5 h-5 text-app-secondary" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-56 bg-app-surface border border-app rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Account Section */}
          <div className="px-2 py-2 border-b border-app">
            <div className="flex items-center justify-between mb-1">
              {/* Left: Label */}
              <p className="text-xs text-app-tertiary">Account</p>

              {/* Right: Status */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-xs text-green-600 dark:text-green-400">Signed In</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <p className="text-xs text-app-secondary">Not Signed In</p>
                </div>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="border-b border-app">
            <div className="py-1">
              {/* Authentication actions */}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm text-app-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <></>
              )}
            </div>
          </div>

          {/* Wallet Section */}
          <div className="px-2 py-2 border-b border-app">
            <div className="flex items-center justify-between mb-1">
              {/* Left: Label */}
              <p className="text-xs text-app-tertiary">Wallet</p>

              {/* Right: Status */}
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-xs text-green-600 dark:text-green-400">Connected</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <p className="text-xs text-app-secondary">Not Connected</p>
                </div>
              )}
            </div>

            {/* Address only when connected */}
            {isConnected && (
              <p className="text-xs font-mono text-app-primary truncate bg-app-card py-1 rounded">
                {address && shortenAddress(address)}
              </p>
            )}
          </div>

          {/* Wallet Actions */}
          <div className="border-b border-app">
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-app-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Wallet
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-app-secondary hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 transition-colors"
              >
                <WalletIcon className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>

          {/* App Options - Future implementation */}
          <div className="py-1">
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-2 px-2 py-2 text-sm text-app-tertiary opacity-50 cursor-not-allowed"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-2 px-2 py-2 text-sm text-app-tertiary opacity-50 cursor-not-allowed"
            >
              <HelpCircle className="w-4 h-4" />
              About
            </button>
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-2 px-2 py-2 text-sm text-app-tertiary opacity-50 cursor-not-allowed"
            >
              <BookOpen className="w-4 h-4" />
              Documentation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
