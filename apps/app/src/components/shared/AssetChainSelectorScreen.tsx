/**
 * Asset/Chain Selector Screen Component
 * Swap-like interface for choosing chain and asset side-by-side
 * Used by both Deposit and Withdrawal forms
 */

import { useState, useMemo } from "react";
import Image from "next/image";
import { getChainIcon, getChainName } from "@/utils/chainIcons";
import { SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { Search } from "lucide-react";

interface Asset {
  symbol: string;
  name: string;
  icon: string;
}

interface AssetChainSelectorScreenProps {
  selectedChainId: number;
  onSelect: (chainId: number, asset: Asset) => void;
}

// For now, we only support ETH on all chains
const AVAILABLE_ASSETS: Asset[] = [{ symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" }];

export function AssetChainSelectorScreen({
  selectedChainId,
  onSelect,
}: AssetChainSelectorScreenProps) {
  const [searchChain, setSearchChain] = useState("");
  const [searchToken, setSearchToken] = useState("");
  const [selectedChain, setSelectedChain] = useState<number | null>(selectedChainId);

  // Filter chains based on search
  const filteredChains = useMemo(() => {
    if (!searchChain) return SHINOBI_CASH_SUPPORTED_CHAINS;
    const search = searchChain.toLowerCase();
    return SHINOBI_CASH_SUPPORTED_CHAINS.filter((chain) =>
      chain.name.toLowerCase().includes(search)
    );
  }, [searchChain]);

  // Filter tokens based on search
  const filteredTokens = useMemo(() => {
    if (!searchToken) return AVAILABLE_ASSETS;
    const search = searchToken.toLowerCase();
    return AVAILABLE_ASSETS.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(search) || asset.name.toLowerCase().includes(search)
    );
  }, [searchToken]);

  const handleSelectToken = (asset: Asset) => {
    if (selectedChain !== null) {
      onSelect(selectedChain, asset);
    }
  };

  return (
    <div className="flex flex-col bg-gray-900">
      {/* Search Inputs */}
      <div className="flex border-b border-gray-800">
        <div className="w-1/2 border-r border-gray-800 px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchChain}
              onChange={(e) => setSearchChain(e.target.value)}
              placeholder="Search chains"
              className="h-10 w-full rounded-lg border border-gray-700 bg-gray-800 pl-10 pr-3 text-sm text-white transition-colors placeholder:text-gray-500 focus:border-purple-600 focus:outline-none"
            />
          </div>
        </div>
        <div className="w-1/2 px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              placeholder="Search tokens"
              className="h-10 w-full rounded-lg border border-gray-700 bg-gray-800 pl-10 pr-3 text-sm text-white transition-colors placeholder:text-gray-500 focus:border-purple-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex h-64 overflow-hidden">
        {/* Left Column - Chains */}
        <div className="w-1/2 overflow-y-auto border-r-2 border-gray-800">
          {filteredChains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => setSelectedChain(chain.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 transition-colors ${
                selectedChain === chain.id
                  ? "border-l-4 border-orange-600 bg-orange-600/20"
                  : "border-l-4 border-transparent hover:bg-gray-800/50"
              }`}
            >
              <div className="flex-shrink-0">
                <Image
                  src={getChainIcon(chain.id)}
                  alt={chain.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-lg"
                />
              </div>
              <span className="text-left text-sm font-medium text-white">
                {getChainName(chain.id)}
              </span>
            </button>
          ))}
          {filteredChains.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">No chains found</div>
          )}
        </div>

        {/* Right Column - Tokens */}
        <div className="w-1/2 overflow-y-auto">
          {filteredTokens.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => handleSelectToken(asset)}
              className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-800/50"
            >
              <div className="relative flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                  <Image
                    src={asset.icon}
                    alt={asset.symbol}
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                </div>
                {selectedChain !== null && (
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-900 bg-white">
                    <Image
                      src={getChainIcon(selectedChain)}
                      alt="Chain"
                      width={12}
                      height={12}
                      className="h-3 w-3"
                    />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col items-start">
                <div className="w-full truncate text-sm font-medium text-white">{asset.name}</div>
                <div className="text-xs text-gray-400">{asset.symbol}</div>
              </div>
            </button>
          ))}
          {filteredTokens.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">No tokens found</div>
          )}
        </div>
      </div>
    </div>
  );
}
