"use client";

import { Bell } from "lucide-react";
import { useAccount } from "wagmi";
import { modal } from "@/context";

export function BottomNav() {
  const { isConnected, address } = useAccount();

  const handleConnectWallet = () => {
    modal.open();
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-t border-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Wallet Address / Connect */}
        {isConnected && address ? (
          <button
            onClick={handleConnectWallet}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-sm font-medium text-white"
          >
            {shortenAddress(address)}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleConnectWallet}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Connect
          </button>
        )}

        {/* Notifications */}
        <button
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-400" />
        </button>

        {/* Network Selector */}
        <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white">
          <div className="w-5 h-5 rounded-full bg-blue-400" />
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
