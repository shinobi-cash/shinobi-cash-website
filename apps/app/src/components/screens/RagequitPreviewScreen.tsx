"use client";

import type { Note } from "@shinobi-cash/core/discovery";
import { Loader2, Info } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Section, Row } from "@/components/shared/Section";
import { NoteAvatarStack } from "@/components/shared/NoteAvatarGroup";
import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount, formatSmallEthAmount, formatEthAmount } from "@/utils/formatters";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { ShinobiCashNote, AssetChain } from "@/components/shared/AssetChain";
import { getNoteLabel } from "@/utils/chainIcons";

interface RagequitPreviewScreenProps {
  onBack: () => void;
  onConfirm: () => void;
  note: Note;
  isProcessing: boolean;
  hasMergeHistory?: boolean;
}

export function RagequitPreviewScreen({
  onBack,
  onConfirm,
  note,
  isProcessing,
  hasMergeHistory = false,
}: RagequitPreviewScreenProps) {
  const amount = Number(formatEthAmount(note.amount, { maxDecimals: 8 }));
  const { usdPrice } = usePriceData("ETH");
  const amountUsd = usdPrice !== null ? amount * usdPrice : null;

  return (
    <ScreenLayout
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={<ScreenHeader title="Public Withdrawal" onBack={onBack} />}
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
      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-200">Public withdrawal</p>
          <p className="text-xs text-neutral-400">
            Your identity will be visible on-chain, linking your deposit address to this withdrawal.
            {hasMergeHistory && (
              <span className="mt-1 block">
                This note includes merged funds from previous withdrawals, which will also be linked to your identity.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Assets */}
      <div className="flex w-full flex-col items-center gap-2 sm:flex-row">
        {/* From */}
        <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:flex-1 sm:p-4">
          <span className="mb-2 text-xs text-neutral-500">You withdraw</span>
          <div className="flex items-center justify-between">
            <ShinobiCashNote />
            <div className="flex flex-col items-end">
              <span className="text-base font-bold sm:text-lg">
                {formatSmallEthAmount(amount)} ETH
              </span>
              {amountUsd !== null && (
                <span className="text-xs text-neutral-500">~{formatUsdAmount(amountUsd)}</span>
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
            <AssetChain assetSymbol="ETH" chainId={POOL_CHAIN.id} />
            <div className="flex flex-col items-end">
              <span className="text-base font-bold sm:text-lg">
                {formatSmallEthAmount(amount)} ETH
              </span>
              {amountUsd !== null && (
                <span className="text-xs text-neutral-500">~{formatUsdAmount(amountUsd)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <Section title="Details">
        <Row
          label="Note"
          value={
            <span className="flex items-center gap-2">
              <NoteAvatarStack notes={[note]} size="sm" />
              <span className="text-neutral-300">{getNoteLabel(note.originChainId, note.depositIndex)}</span>
            </span>
          }
        />
        <Row label="Chain" value={POOL_CHAIN.name} />
        <Row
          label="ASP Status"
          value={
            <span
              className={`capitalize ${
                note.aspStatus === "approved"
                  ? "text-emerald-400"
                  : note.aspStatus === "rejected"
                    ? "text-rose-400"
                    : "text-amber-400"
              }`}
            >
              {note.aspStatus}
            </span>
          }
        />
      </Section>

      {/* Gas Info */}
      <Section title="Gas">
        <Row
          label="Paid by"
          value={<span className="text-neutral-300">You (wallet)</span>}
        />
        <Row
          label="Estimated"
          value={<span className="text-neutral-400">~0.001 ETH</span>}
        />
      </Section>
    </ScreenLayout>
  );
}
