"use client";

import { Loader2, Globe, Clock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Section, Row } from "@/components/shared/Section";
import { LabelWithHover } from "@/components/shared/LabelWithHover";
import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount, formatSmallEthAmount } from "@/utils/formatters";
import {
  POOL_CHAIN,
  SHINOBI_CASH_SUPPORTED_CHAINS,
  CROSSCHAIN_DEPOSIT_TIMING,
} from "@shinobi-cash/constants";
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
  isCrossChain: boolean;
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
  isCrossChain,
}: DepositPreviewScreenProps) {
  const depositAmountNum = Number.parseFloat(depositAmount) || 0;
  const gasCostNum = Number.parseFloat(gasCostEth) || 0;

  // Fee calculation:
  // 1. Solver fee is deducted on origin chain (cross-chain only)
  // 2. Vetting fee (1%) is deducted on pool chain from net amount
  // 3. Gas is paid separately, NOT deducted from note amount
  const netAfterSolverFee = depositAmountNum - solverFee;
  const depositNoteAmount = netAfterSolverFee - complianceFee;

  // Vetting fee is calculated on net amount after solver fee, not original deposit
  const vettingFeePercent = netAfterSolverFee > 0 ? (complianceFee / netAfterSolverFee) * 100 : 0;

  const { usdPrice } = usePriceData("ETH");

  const depositUsd = usdPrice !== null ? depositAmountNum * usdPrice : null;
  const noteUsd = usdPrice !== null ? depositNoteAmount * usdPrice : null;
  const vettingFeeUsd = usdPrice !== null ? complianceFee * usdPrice : null;
  const gasFeeUsd = usdPrice !== null ? gasCostNum * usdPrice : null;
  const solverFeeUsd = usdPrice !== null && solverFee > 0 ? solverFee * usdPrice : null;

  const originChain =
    SHINOBI_CASH_SUPPORTED_CHAINS.find((c) => c.id === originChainId) ?? POOL_CHAIN;

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
  // TODO: Use once expiry is closer to fill deadline
  // const refundWindow = formatDuration(CROSSCHAIN_DEPOSIT_TIMING.EXPIRY_SECONDS);

  return (
    <ScreenLayout
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={<ScreenHeader title="Transaction Preview" onBack={onBack} />}
      contentClassName="space-y-4 px-4 py-4"
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
            "Confirm Deposit"
          )}
        </Button>
      }
    >
      {/* Assets - Stack on mobile, horizontal on desktop */}
      <div className="flex w-full flex-col items-center gap-2 sm:flex-row">
        {/* From */}
        <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:flex-1 sm:p-4">
          <span className="mb-2 text-xs text-neutral-500">You send</span>
          <div className="flex items-center justify-between">
            <AssetChain assetSymbol="ETH" chainId={originChainId} />
            <div className="flex flex-col items-end">
              <span className="text-base font-bold sm:text-lg">
                {formatSmallEthAmount(depositAmountNum)} ETH
              </span>
              {depositUsd !== null && (
                <span className="text-xs text-neutral-500">~{formatUsdAmount(depositUsd)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex h-8 w-8 shrink-0 rotate-90 items-center justify-center rounded-full border border-white/10 bg-neutral-900 sm:rotate-0">
          <svg
            className="h-4 w-4 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </div>

        {/* To */}
        <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:flex-1 sm:p-4">
          <span className="mb-2 text-xs text-neutral-500">You receive</span>
          <div className="flex items-center justify-between">
            <ShinobiCashNote />
            <div className="flex flex-col items-end">
              <span className="text-base font-bold sm:text-lg">
                {formatSmallEthAmount(depositNoteAmount)} ETH
              </span>
              {noteUsd !== null && (
                <span className="text-xs text-neutral-500">~{formatUsdAmount(noteUsd)}</span>
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
        <Row label="Origin" value={originChain.name} />
        <Row label="Destination" value={POOL_CHAIN.name} />
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
          label={`Vetting Fee (${vettingFeePercent.toFixed(0)}%)`}
          value={<FeeValue amount={complianceFee} usdValue={vettingFeeUsd} />}
        />
        <Row label="Network Gas" value={<FeeValue amount={gasCostNum} usdValue={gasFeeUsd} />} />
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
