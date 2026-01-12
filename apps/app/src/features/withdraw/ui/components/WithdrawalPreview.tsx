"use client";

import { Loader2, ArrowDownUp } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { usePriceData } from "@/hooks/usePriceData";
import { formatEthAmount, formatUsdAmount, formatHash } from "@/utils/formatters";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { ShinobiCashNote, TokenChain } from "@/components/shared/TokenChain";

interface WithdrawalPreviewProps {
  onBack: () => void;
  onConfirm: () => void;
  withdrawAmount: string;
  executionFee: number;
  solverFee: number;
  youReceive: number;
  recipientAddress: string;
  destinationChainId: number;
  isCrossChain: boolean;
  isProcessing: boolean;
}

export function WithdrawalPreview({
  onBack,
  onConfirm,
  withdrawAmount,
  executionFee,
  solverFee,
  youReceive,
  recipientAddress,
  destinationChainId,
  isCrossChain,
  isProcessing,
}: WithdrawalPreviewProps) {
  const withdrawAmountNum = Number.parseFloat(withdrawAmount) || 0;

  const { usdPrice } = usePriceData("ETH");

  const withdrawUsd = usdPrice !== null ? withdrawAmountNum * usdPrice : null;
  const receiveUsd = usdPrice !== null ? youReceive * usdPrice : null;

  const destinationChain =
    SHINOBI_CASH_SUPPORTED_CHAINS.find((c) => c.id === destinationChainId) ?? POOL_CHAIN;

  return (
    <div className="flex flex-1 flex-col space-y-4 px-6 py-4 font-sans text-white">
      {/* Hero */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center justify-center rounded-full bg-purple-600">
          <ArrowDownUp className="h-12 w-12" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold">
            You'll receive {formatEthAmount(youReceive, { decimals: 4 })} ETH
          </h1>

          {receiveUsd !== null && (
            <p className="text-md text-zinc-500">{formatUsdAmount(receiveUsd)}</p>
          )}
        </div>
      </div>

      {/* Assets */}
      <div className="w-full space-y-3">
        {/* From */}
        <div className="flex items-center gap-4 rounded-3xl border bg-gray-800/90 p-4">
          <ShinobiCashNote />

          <div className="flex flex-1 flex-col">
            <span className="text-xs font-medium uppercase text-zinc-500">You withdraw</span>
            <span className="text-lg font-bold">Note</span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-lg font-bold">
              {formatEthAmount(withdrawAmountNum, { decimals: 4 })} ETH
            </span>
            {withdrawUsd !== null && (
              <span className="text-xs text-zinc-500">{formatUsdAmount(withdrawUsd)}</span>
            )}
          </div>
        </div>

        {/* To */}
        <div className="flex items-center gap-4 rounded-3xl border bg-gray-800/90 p-4">
          <TokenChain assetSymbol="ETH" chainId={destinationChainId} />

          <div className="flex flex-1 flex-col">
            <span className="text-xs font-medium uppercase text-zinc-500">You receive</span>
            <span className="text-lg font-bold">ETH</span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-lg font-bold">
              {formatEthAmount(youReceive, { decimals: 4 })} ETH
            </span>
            {receiveUsd !== null && (
              <span className="text-xs text-zinc-500">{formatUsdAmount(receiveUsd)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="w-full space-y-2">
        <DetailRow label="Destination" value={destinationChain.name} />
        <DetailRow label="Recipient" value={formatHash(recipientAddress)} />
        <DetailRow
          label={isCrossChain ? "Relay Fee (Max)" : "Execution Fee (Max)"}
          value={`${formatEthAmount(executionFee)} ETH`}
        />
        {isCrossChain && solverFee > 0 && (
          <DetailRow label="Solver Fee" value={`${formatEthAmount(solverFee)} ETH`} />
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
          className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
          size="lg"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing…
            </span>
          ) : (
            "Confirm Withdrawal"
          )}
        </Button>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15px] text-zinc-500">{label}</span>
      <span className="text-[15px] font-medium text-zinc-200">{value}</span>
    </div>
  );
}
