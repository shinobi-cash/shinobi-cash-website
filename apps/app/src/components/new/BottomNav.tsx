"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { modal } from "@/context";
import { SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@workspace/ui/components/select";

export function BottomNav() {
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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-900/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        {/* Wallet Address / Connect */}
        {isConnected && address ? (
          <button
            onClick={handleConnectWallet}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white"
          >
            {shortenAddress(address)}
          </button>
        ) : (
          <button
            onClick={handleConnectWallet}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Connect Wallet
          </button>
        )}

        {/* Chain Selector */}
        {isConnected && currentChain ? (
          <Select value={chainId.toString()} onValueChange={handleChainSwitch}>
            <SelectTrigger className="h-10 w-10 border-gray-700 bg-gray-800 p-2 [&>svg]:hidden">
              <Image
                src={getChainIcon(chainId)}
                alt={currentChain.name}
                width={20}
                height={20}
                className="h-full w-full"
              />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900">
              {SHINOBI_CASH_SUPPORTED_CHAINS.map((chain) => (
                <SelectItem
                  key={chain.id}
                  value={chain.id.toString()}
                  className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
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
        ) : null}
      </div>
    </div>
  );
}
