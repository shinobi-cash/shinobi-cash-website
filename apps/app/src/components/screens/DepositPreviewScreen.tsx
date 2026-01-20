"use client";

import { Loader2, Shield } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount, formatSmallEthAmount } from "@/utils/formatters";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { ShinobiCashNote, AssetChain } from "@/components/shared/AssetChain";

interface DepositPreviewScreenProps {
  onBack: () => void;
  onConfirm: () => void;
  depositAmount: string;
  complianceFee: number;
  gasCostEth: string;
  solverFee: number;
  originChainId: number;
  destinationChainId: number;
  poolAddress: string;
  userAddress: string;
  isProcessing: boolean;
}

export function DepositPreviewScreen({
  onBack,
  onConfirm,
  depositAmount,
  complianceFee,
  gasCostEth,
  solverFee,
  originChainId,
  isProcessing,
}: DepositPreviewScreenProps) {
  const depositAmountNum = Number.parseFloat(depositAmount) || 0;
  const gasCostNum = Number.parseFloat(gasCostEth) || 0;

  const depositNoteAmount = depositAmountNum - complianceFee - gasCostNum - solverFee;
  const vettingFeePercent = depositAmountNum > 0 ? (complianceFee / depositAmountNum) * 100 : 0;

  const { usdPrice } = usePriceData("ETH");

  const depositUsd = usdPrice !== null ? depositAmountNum * usdPrice : null;
  const noteUsd = usdPrice !== null ? depositNoteAmount * usdPrice : null;
  const vettingFeeUsd = usdPrice !== null ? complianceFee * usdPrice : null;
  const gasFeeUsd = usdPrice !== null ? gasCostNum * usdPrice : null;

  const originChain =
    SHINOBI_CASH_SUPPORTED_CHAINS.find((c) => c.id === originChainId) ?? POOL_CHAIN;

  return (
    <ScreenLayout
      containerClassName="h-[600px]"
      header={<ScreenHeader title="Transaction Preview" onBack={onBack} />}
      contentClassName="space-y-4 px-6 py-4 font-sans text-white"
    >
      {/* Hero */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
          <Shield className="h-8 w-8" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold">
            You'll deposit {formatSmallEthAmount(depositAmountNum)} ETH
          </h1>

          {depositUsd !== null && <p className="text-md text-zinc-500">~{formatUsdAmount(depositUsd)}</p>}
        </div>
      </div>

      {/* Assets */}
      <div className="w-full space-y-3">
        {/* From */}
        <div className="bg-muted/90 flex items-center gap-4 rounded-3xl border p-4">
          <AssetChain assetSymbol="ETH" chainId={originChainId} />

          <div className="flex flex-1 flex-col">
            <span className="text-xs font-medium uppercase text-zinc-500">You send</span>
            <span className="text-lg font-bold">{"ETH"}</span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-lg font-bold">
              {formatSmallEthAmount(depositAmountNum)} ETH
            </span>
            {depositUsd !== null && (
              <span className="text-xs text-zinc-500">~{formatUsdAmount(depositUsd)}</span>
            )}
          </div>
        </div>

        {/* To */}
        <div className="bg-muted/90 flex items-center gap-4 rounded-3xl border p-4">
          <ShinobiCashNote />

          <div className="flex flex-1 flex-col">
            <span className="text-xs font-medium uppercase text-zinc-500">You receive</span>
            <span className="text-lg font-bold">Note</span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-lg font-bold">
              {formatSmallEthAmount(depositNoteAmount)} ETH
            </span>
            {noteUsd !== null && (
              <span className="text-xs text-zinc-500">~{formatUsdAmount(noteUsd)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="w-full space-y-2">
        <DetailRow label="Origin" value={originChain.name} />
        <DetailRow
          label={`Vetting Fee (${vettingFeePercent.toFixed(0)}%)`}
          value={`${formatSmallEthAmount(complianceFee)} ETH${vettingFeeUsd !== null ? ` (~${formatUsdAmount(vettingFeeUsd)})` : ""}`}
        />
        <DetailRow
          label="Network Gas Fee"
          value={`${formatSmallEthAmount(gasCostNum)} ETH${gasFeeUsd !== null ? ` (~${formatUsdAmount(gasFeeUsd)})` : ""}`}
        />
        {/*TODO:Improvement Route will only be possible when deposit is crosschain which get filled by Shinobi Solver */}
        {/* <DetailRow
            label="Route"
            value={
              <span className="flex items-center gap-1.5 text-blue-400">
                <Globe className="h-4 w-4" />
                Shinobi Relay
              </span>
            }
          /> */}
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
            "Confirm Deposit"
          )}
        </Button>
      </div>
    </ScreenLayout>
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
