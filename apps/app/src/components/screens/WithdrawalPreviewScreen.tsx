"use client";

import type { Note } from "@shinobi-cash/core/discovery";
import { Loader2, Globe, Clock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Section, Row } from "@/components/shared/Section";
import { LabelWithHover } from "@/components/shared/LabelWithHover";
import { NoteAvatarStack } from "@/components/shared/NoteAvatarGroup";
import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount, formatHash, formatDisplayAmount } from "@/utils/formatters";
import {
  POOL_CHAIN,
  SHINOBI_CASH_SUPPORTED_CHAINS,
  INTENT_TIMING,
  FEE_CONFIG,
} from "@shinobi-cash/constants";
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
  selectedNotes: readonly Note[];
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
  selectedNotes,
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

  const fillDeadline = formatDuration(INTENT_TIMING.FILL_DEADLINE_SECONDS);
  const solverFeePercent = FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS / 100;

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
            "Confirm Withdrawal"
          )}
        </Button>
      }
    >
      {/* Assets - Stack on mobile, horizontal on desktop */}
      <div className="flex w-full flex-col items-center gap-2 sm:flex-row">
        {/* From */}
        <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:flex-1 sm:p-4">
          <span className="mb-2 text-xs text-neutral-500">You withdraw</span>
          <div className="flex items-center justify-between">
            <ShinobiCashNote />
            <div className="flex flex-col items-end">
              <span className="text-base font-bold sm:text-lg">
                {formatDisplayAmount(withdrawAmountNum)} ETH
              </span>
              {withdrawUsd !== null && (
                <span className="text-xs text-neutral-500">~{formatUsdAmount(withdrawUsd)}</span>
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
            <AssetChain assetSymbol="ETH" chainId={destinationChainId} />
            <div className="flex flex-col items-end">
              <span className="text-base font-bold sm:text-lg">
                {formatDisplayAmount(youReceive)} ETH
              </span>
              {receiveUsd !== null && (
                <span className="text-xs text-neutral-500">~{formatUsdAmount(receiveUsd)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <Section title="Details">
        <Row
          label={selectedNotes.length > 1 ? "Notes" : "Note"}
          value={
            <span className="flex items-center gap-2">
              <NoteAvatarStack notes={selectedNotes} size="sm" />
              <span className="font-mono text-neutral-300">
                {selectedNotes.length === 1
                  ? selectedNotes[0].serialNumber
                  : `${selectedNotes[0].serialNumber} + ${selectedNotes[1].serialNumber}`}
              </span>
            </span>
          }
        />
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
            label={`Solver Fee (${solverFeePercent}%)`}
            value={<FeeValue amount={solverFee} usdValue={solverFeeUsd} />}
          />
        )}
        <Row
          label="Relay Fee (Max)"
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
  const ethText = `${formatDisplayAmount(amount)} ETH`;

  if (usdValue !== null) {
    return (
      <LabelWithHover hoverText={ethText} className="cursor-help">
        ~{formatUsdAmount(usdValue)}
      </LabelWithHover>
    );
  }

  return <>{ethText}</>;
}
