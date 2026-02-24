"use client";

import type { Intent } from "@shinobi-cash/data";
import { getRefundFeeBps, type RefundType } from "@shinobi-cash/core/intent";
import { Loader2, Info } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Section, Row } from "@/components/shared/Section";
import { AssetChain } from "@/components/shared/AssetChain";
import { CopyableText } from "@/components/shared/CopyableText";
import { LabelWithHover } from "@/components/shared/LabelWithHover";
import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount, formatSmallEthAmount, formatEthAmount, formatDisplayAmount } from "@/utils/formatters";
import { getChainName, POOL_CHAIN_ID } from "@/config/chains";

interface RefundPreviewScreenProps {
  onBack: () => void;
  onConfirm: () => void;
  intent: Intent;
  refundType: RefundType;
  isProcessing: boolean;
}

export function RefundPreviewScreen({
  onBack,
  onConfirm,
  intent,
  refundType,
  isProcessing,
}: RefundPreviewScreenProps) {
  const amount = Number(formatEthAmount(intent.inputAmount, { maxDecimals: 8 }));
  const { usdPrice } = usePriceData("ETH");
  const amountUsd = usdPrice !== null ? amount * usdPrice : null;

  const isDeposit = refundType === "deposit";
  const chainId = isDeposit ? Number(intent.originChainId) : POOL_CHAIN_ID;
  const chainName = getChainName(chainId);

  // Decode refund fee from raw intent calldata (withdrawal refunds only)
  const refundFeeBps = getRefundFeeBps(intent.rawIntent);
  const refundFeePercent = refundFeeBps !== null ? refundFeeBps / 100 : null;
  const refundFeeAmount = refundFeeBps !== null ? amount * refundFeeBps / 10000 : 0;
  const refundFeeUsd = usdPrice !== null ? refundFeeAmount * usdPrice : null;
  const netAmount = amount - refundFeeAmount;
  const netAmountUsd = usdPrice !== null ? netAmount * usdPrice : null;

  return (
    <ScreenLayout
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={<ScreenHeader title="Claim Refund" onBack={onBack} />}
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
            "Confirm Refund"
          )}
        </Button>
      }
    >
      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
        <div className="space-y-1">
          <p className="text-sm text-neutral-400">
            {isDeposit
              ? "This intent expired without being filled. Your deposited funds will be returned to your wallet on the origin chain."
              : "This intent expired without being filled. A refund commitment will be created in the pool that you can withdraw privately."}
          </p>
        </div>
      </div>

      {/* Amount Card */}
      <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
        <span className="mb-2 text-xs text-neutral-500">
          {isDeposit ? "Refund amount" : "You receive"}
        </span>
        <div className="flex items-center justify-between">
          <AssetChain assetSymbol="ETH" chainId={chainId} />
          <div className="flex flex-col items-end">
            <span className="text-base font-bold sm:text-lg">
              {formatSmallEthAmount(isDeposit ? amount : netAmount)} ETH
            </span>
            {(isDeposit ? amountUsd : netAmountUsd) !== null && (
              <span className="text-xs text-neutral-500">
                ~{formatUsdAmount((isDeposit ? amountUsd : netAmountUsd)!)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <Section title="Details">
        <Row label="Type" value={isDeposit ? "Deposit refund" : "Withdrawal refund"} />
        <Row label="Chain" value={chainName} />
        <Row
          label="Order ID"
          value={<CopyableText text={intent.orderId} className="text-xs" />}
        />
      </Section>

      {/* Fees */}
      <Section title="Fees">
        {!isDeposit && refundFeePercent !== null ? (
          <>
            <Row
              label={`Refund Fee (${refundFeePercent}%)`}
              value={<FeeValue amount={refundFeeAmount} usdValue={refundFeeUsd} />}
            />
          </>
        ) : (
          <Row label="Refund Fee" value={<span className="text-emerald-400">None</span>} />
        )}
      </Section>

      {/* Gas Info */}
      <Section title="Gas">
        {isDeposit ? (
          <Row label="Paid by" value={<span className="text-neutral-300">You (wallet)</span>} />
        ) : (
          <Row label="Paid by" value={<span className="text-emerald-400">Paymaster (gasless)</span>} />
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
