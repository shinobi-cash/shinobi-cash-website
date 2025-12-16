"use client";

import Image from "next/image";
import Link from "next/link";
import { Settings, BarChart3 } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { modal } from "@/context";
import { Button } from "@/components/ui/button";
import { SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Header() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const handleConnectWallet = () => {
    modal.open();
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
    <header className="flex items-center justify-between mx-auto border border-gray-800 rounded-xl sm:rounded-2xl bg-black/50 backdrop-blur-sm py-3 px-4 sm:px-6 lg:px-8">
        {/* Logo and Navigation */}
        <div className="flex gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            {/* Mobile icon */}
            <Image
              src="/Shinobi.Cash-icon.svg"
              alt="Shinobi Cash"
              width={32}
              height={32}
              className="block md:hidden h-8 w-8"
              priority
            />

            {/* Desktop logo */}
            <Image
              src="/Shinobi.Cash-white-text.png"
              alt="Shinobi Cash"
              width={160}
              height={40}
              className="hidden md:block h-10 lg:h-12 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/pool"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Pool
            </Link>
          </nav>
        </div>

        {/* Actions - Right */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Desktop: Chain Selector */}
          {isConnected && currentChain && (
            <Select value={chainId.toString()} onValueChange={handleChainSwitch}>
              <SelectTrigger className="hidden md:flex items-center gap-2 h-9 sm:h-10 lg:h-11 w-auto min-w-[140px] border-gray-700 bg-gray-900/50">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <Image
                      src={getChainIcon(chainId)}
                      alt={currentChain.name}
                      width={20}
                      height={20}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                    <span className="text-xs sm:text-sm lg:text-base font-medium">{currentChain.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {SHINOBI_CASH_SUPPORTED_CHAINS.map((chain) => (
                  <SelectItem
                    key={chain.id}
                    value={chain.id.toString()}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={getChainIcon(chain.id)}
                        alt={chain.name}
                        width={20}
                        height={20}
                        className="w-5 h-5"
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
              className="hidden md:flex text-xs sm:text-sm lg:text-base font-medium h-9 sm:h-10 lg:h-11"
            >
              {address && shortenAddress(address)}
            </Button>
          ) : (
            <Button
              onClick={handleConnectWallet}
              variant="default"
              size="default"
              className="hidden md:flex text-xs sm:text-sm lg:text-base font-medium bg-orange-600 hover:bg-orange-700 h-9 sm:h-10 lg:h-11"
            >
              Connect Wallet
            </Button>
          )}

          {/* Settings Icon */}
          <button
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>

          {/* Mobile: Menu Icon */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Menu"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
    </header>
  );
}
