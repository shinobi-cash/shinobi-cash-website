"use client";

import { Loader2, Globe, Clock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Section, Row } from "@/components/shared/Section";
import { LabelWithHover } from "@/components/shared/LabelWithHover";
import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount, formatHash, formatSmallEthAmount } from "@/utils/formatters";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS, CROSSCHAIN_DEPOSIT_TIMING } from "@shinobi-cash/constants";
import { ShinobiCashNote, AssetChain } from "@/components/shared/AssetChain";

interface WithdrawalPreviewScreenProps {
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

export function WithdrawalPreviewScreen({
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
}: WithdrawalPreviewScreenProps) {
  const withdrawAmountNum = Number.parseFloat(withdrawAmount) || 0;

  const { usdPrice } = usePriceData("ETH");

  const withdrawUsd = usdPrice !== null ? withdrawAmountNum * usdPrice : null;
  const receiveUsd = usdPrice !== null ? youReceive * usdPrice : null;
  const executionFeeUsd = usdPrice !== null ? executionFee * usdPrice : null;
  const solverFeeUsd = usdPrice !== null ? solverFee * usdPrice : null;

  const destinationChain =
    SHINOBI_CASH_SUPPORTED_CHAINS.find((c) => c.id === destinationChainId) ?? POOL_CHAIN;

  // Format timing for display
  const formatDuration = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  };

  const fillDeadline = formatDuration(CROSSCHAIN_DEPOSIT_TIMING.FILL_DEADLINE_SECONDS);

  return (
    <ScreenLayout
      containerClassName="h-[600px] bg-white/[0.02]"
      header={<ScreenHeader title="Transaction Preview" onBack={onBack} />}
      contentClassName="space-y-4 px-6 py-4 font-sans text-white"
      footer={
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
      }
    >
      {/* Assets - Horizontal Layout */}
      <div className="flex w-full items-center gap-2">
        {/* From */}
        <div className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <span className="mb-2 text-xs text-neutral-500">You withdraw</span>
          <div className="flex items-center justify-between">
            <ShinobiCashNote />
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold">{formatSmallEthAmount(withdrawAmountNum)} ETH</span>
              {withdrawUsd !== null && (
                <span className="text-xs text-neutral-500">~{formatUsdAmount(withdrawUsd)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-neutral-900">
          <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>

        {/* To */}
        <div className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <span className="mb-2 text-xs text-neutral-500">You receive</span>
          <div className="flex items-center justify-between">
            <AssetChain assetSymbol="ETH" chainId={destinationChainId} />
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold">{formatSmallEthAmount(youReceive)} ETH</span>
              {receiveUsd !== null && (
                <span className="text-xs text-neutral-500">~{formatUsdAmount(receiveUsd)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <Section title="Details">
        {isCrossChain && (
          <Row
            label="Route"
            value={
              <span className="flex items-center gap-1.5 text-blue-400">
                <Globe className="h-4 w-4" />
                Shinobi Solver
              </span>
            }
          />
        )}
        <Row label="Origin" value={POOL_CHAIN.name} />
        <Row label="Destination" value={destinationChain.name} />
        <Row label="Recipient" value={formatHash(recipientAddress)} />
      </Section>

      {/* Fees */}
      <Section title="Fees">
        {isCrossChain && solverFee > 0 && (
          <Row
            label="Solver Fee (5%)"
            value={<FeeValue amount={solverFee} usdValue={solverFeeUsd} />}
          />
        )}
        <Row
          label={isCrossChain ? "Relay Fee (Max)" : "Execution Fee (Max)"}
          value={<FeeValue amount={executionFee} usdValue={executionFeeUsd} />}
        />
        {isCrossChain && (
          <Row
            label="Fill Deadline"
            value={
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-neutral-500" />
                {fillDeadline}
              </span>
            }
          />
        )}
      </Section>
    </ScreenLayout>
  );
}

/* ---------- helpers ---------- */

function FeeValue({ amount, usdValue }: { amount: number; usdValue: number | null }) {
  const ethText = `${formatSmallEthAmount(amount)} ETH`;

  if (usdValue !== null) {
    return (
      <LabelWithHover hoverText={ethText} className="cursor-help">
        ~{formatUsdAmount(usdValue)}
      </LabelWithHover>
    );
  }

  return <>{ethText}</>;
}
