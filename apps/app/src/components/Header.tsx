"use client";

import Image from "next/image";
import Link from "next/link";
import { Settings, Menu } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { modal } from "@/context";
import { Button } from "@workspace/ui/components/button";
import { SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useState } from "react";
import { AddPasskeyModal } from "@/features/auth/components/AddPasskeyModal";
import { AccountMenu } from "@/features/auth/components/AccountMenu";

export function Header() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showAddPasskeyModal, setShowAddPasskeyModal] = useState(false);

  const handleConnectWallet = () => {
    modal.open();
  };

  const handleAddPasskey = () => {
    setShowAddPasskeyModal(true);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getCurrentChain = () => {
    return SHINOBI_CASH_SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
  };

  const getChainIcon = (id: number) => {
    const chainIconMap: Record<number, string> = {
      // Mainnets
      1: "/chains/eth-diamond-black-white.svg",
      8453: "/chains/Base_square_blue.svg",
      10: "/chains/OPMainnet_square.svg",
      42161: "/chains/AF_logomark.svg",
      // Testnets
      421614: "/chains/AF_logomark.svg",
      84532: "/chains/Base_square_blue.svg",
      11155111: "/chains/eth-diamond-black-white.svg",
      11155420: "/chains/OPMainnet_square.svg",
    };
    return chainIconMap[id] || "/chains/eth-diamond-black-white.svg";
  };

  const handleChainSwitch = (newChainId: string) => {
    if (switchChain) {
      switchChain({ chainId: Number(newChainId) });
    }
  };

  const currentChain = getCurrentChain();

  return (
    <>
      <AddPasskeyModal open={showAddPasskeyModal} onOpenChange={setShowAddPasskeyModal} />
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
          {/* Desktop: Chain Selector */}
          {isConnected && currentChain && (
            <Select value={chainId.toString()} onValueChange={handleChainSwitch}>
              <SelectTrigger className="hidden h-9 w-auto min-w-[140px] items-center gap-2 border-gray-700 bg-gray-900/50 sm:h-10 md:flex lg:h-11">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <Image
                      src={getChainIcon(chainId)}
                      alt={currentChain.name}
                      width={20}
                      height={20}
                      className="h-4 w-4 sm:h-5 sm:w-5"
                    />
                    <span className="text-xs font-medium sm:text-sm lg:text-base">
                      {currentChain.name}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-900">
                {SHINOBI_CASH_SUPPORTED_CHAINS.map((chain) => (
                  <SelectItem
                    key={chain.id}
                    value={chain.id.toString()}
                    className="flex cursor-pointer items-center gap-2 hover:bg-gray-800 focus:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={getChainIcon(chain.id)}
                        alt={chain.name}
                        width={20}
                        height={20}
                        className="h-5 w-5"
                      />
                      <span className="text-sm font-medium">{chain.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Desktop: Connect Wallet Button */}
          {isConnected ? (
            <Button
              onClick={handleConnectWallet}
              variant="outline"
              size="default"
              className="hidden h-9 text-xs font-medium sm:h-10 sm:text-sm md:flex lg:h-11 lg:text-base"
            >
              {address && shortenAddress(address)}
            </Button>
          ) : (
            <Button
              onClick={handleConnectWallet}
              variant="default"
              size="default"
              className="hidden h-9 text-xs font-medium sm:h-10 sm:text-sm md:flex lg:h-11 lg:text-base"
            >
              Connect Wallet
            </Button>
          )}

          {/* Account Menu */}
          <AccountMenu onAddPasskey={handleAddPasskey}>
            <button
              className="rounded-lg p-2 transition-colors hover:bg-gray-800"
              aria-label="Account Menu"
            >
              <Settings className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </AccountMenu>

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
