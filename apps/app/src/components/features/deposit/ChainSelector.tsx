import { memo, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { Zap, Clock } from "lucide-react";

interface ChainSelectorProps {
  selectedChainId: number;
  onChainSelect: (chainId: number) => void;
  label?: string;
  disabled?: boolean;
  showTimeIndicators?: boolean;
  groupByType?: boolean;
}

export const ChainSelector = memo(({
  selectedChainId,
  onChainSelect,
  label = "Chain",
  disabled,
  showTimeIndicators = false,
  groupByType = false,
}: ChainSelectorProps) => {
  const selectedChain = useMemo(
    () => SHINOBI_CASH_SUPPORTED_CHAINS.find(chain => chain.id === selectedChainId),
    [selectedChainId]
  );

  const directChains = useMemo(
    () => SHINOBI_CASH_SUPPORTED_CHAINS.filter(chain => chain.id === POOL_CHAIN.id),
    []
  );

  const crossChainChains = useMemo(
    () => SHINOBI_CASH_SUPPORTED_CHAINS.filter(chain => chain.id !== POOL_CHAIN.id),
    []
  );

  return (
    <div className="mb-6">
      <label className="text-xs font-bold text-app-secondary mb-2 block">
        {label}
      </label>
      <Select
        value={selectedChainId.toString()}
        onValueChange={(value: string) => onChainSelect(Number(value))}
        disabled={disabled}
      >
        <SelectTrigger className="w-full h-12 bg-app-card border-app-border">
          <SelectValue>
            <span className="text-sm text-app-primary">
              {selectedChain?.name ?? `Chain ${selectedChainId}`}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groupByType ? (
            <>
              {/* Direct Deposit */}
              <SelectGroup>
                <SelectLabel>Direct Deposit</SelectLabel>
                {directChains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id.toString()}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{chain.name}</span>
                      {showTimeIndicators && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Zap className="w-3 h-3" />
                          <span className="text-xs">Instant</span>
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>

              {/* Cross-Chain Deposits */}
              {crossChainChains.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Cross-Chain Deposits</SelectLabel>
                  {crossChainChains.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id.toString()}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{chain.name}</span>
                        {showTimeIndicators && (
                          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">1-5 min</span>
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </>
          ) : (
            <SelectGroup>
              <SelectLabel>Available Chains</SelectLabel>
              {SHINOBI_CASH_SUPPORTED_CHAINS.map((chain) => (
                <SelectItem key={chain.id} value={chain.id.toString()}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
});

ChainSelector.displayName = 'ChainSelector';
