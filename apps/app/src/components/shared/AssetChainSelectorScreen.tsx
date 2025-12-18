/**
 * Asset/Chain Selector Screen Component
 * Swap-like interface for choosing chain and asset side-by-side
 * Used by both Deposit and Withdrawal forms
 */

import { useState, useMemo } from "react";
import Image from "next/image";
import { BackButton } from "../ui/back-button";
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
  selectedAsset: Asset;
  onSelect: (chainId: number, asset: Asset) => void;
  onBack: () => void;
}

// For now, we only support ETH on all chains
const AVAILABLE_ASSETS: Asset[] = [
  { symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" },
];

export function AssetChainSelectorScreen({
  selectedChainId,
  selectedAsset,
  onSelect,
  onBack,
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
        asset.symbol.toLowerCase().includes(search) ||
        asset.name.toLowerCase().includes(search)
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
        <div className="w-1/2 px-4 py-4 border-r border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              value={searchChain}
              onChange={(e) => setSearchChain(e.target.value)}
              placeholder="Search chains"
              className="w-full h-10 pl-10 pr-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>
        </div>
        <div className="w-1/2 px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              placeholder="Search tokens"
              className="w-full h-10 pl-10 pr-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex h-64 overflow-hidden">
        {/* Left Column - Chains */}
        <div className="w-1/2 border-r-2 border-gray-800 overflow-y-auto">
          {filteredChains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => setSelectedChain(chain.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                selectedChain === chain.id
                  ? "bg-orange-600/20 border-l-4 border-orange-600"
                  : "hover:bg-gray-800/50 border-l-4 border-transparent"
              }`}
            >
              <div className="flex-shrink-0">
                <Image
                  src={getChainIcon(chain.id)}
                  alt={chain.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg"
                />
              </div>
              <span className="text-sm font-medium text-white text-left">{getChainName(chain.id)}</span>
            </button>
          ))}
          {filteredChains.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No chains found</div>
          )}
        </div>

        {/* Right Column - Tokens */}
        <div className="w-1/2 overflow-y-auto">
          {filteredTokens.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => handleSelectToken(asset)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Image
                    src={asset.icon}
                    alt={asset.symbol}
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                </div>
                {selectedChain !== null && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border-2 border-gray-900">
                    <Image
                      src={getChainIcon(selectedChain)}
                      alt="Chain"
                      width={12}
                      height={12}
                      className="w-3 h-3"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <div className="text-sm font-medium text-white truncate w-full">{asset.name}</div>
                <div className="text-xs text-gray-400">{asset.symbol}</div>
              </div>
            </button>
          ))}
          {filteredTokens.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No tokens found</div>
          )}
        </div>
      </div>
    </div>
  );
}
