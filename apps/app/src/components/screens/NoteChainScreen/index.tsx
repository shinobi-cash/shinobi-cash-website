/**
 * Note Chain Screen Component
 * Full-screen view for displaying note chain details with transaction timeline
 */

import { useRouter } from "next/navigation";
import { getNoteLabel } from "@/utils/chainIcons";
import type { NoteChain } from "@shinobi-cash/core/discovery";
import { formatEthAmount, formatUsdAmount } from "@/utils/formatters";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Section, Row } from "@/components/shared/Section";
import { usePriceData } from "@/hooks/usePriceData";
import { canWithdraw, canRagequit } from "@/utils/noteFiltering";
import { WithdrawController } from "@/controllers/WithdrawController";
import { RagequitController } from "@/controllers/RagequitController";
import { HistoryTimeline } from "./HistoryTimeline";
import { buildTimelineEntries } from "./utils";

interface NoteChainScreenProps {
  noteChain: NoteChain | null;
  onBack: () => void;
}

export function NoteChainScreen({ noteChain, onBack }: NoteChainScreenProps) {
  const router = useRouter();
  const { usdPrice } = usePriceData("ETH");

  if (!noteChain) return null;

  const lastNote = noteChain[noteChain.length - 1];
  const canWithdrawPrivately = canWithdraw(lastNote);
  const canWithdrawPublicly = canRagequit(lastNote);
  const hasActions = canWithdrawPrivately || canWithdrawPublicly;

  const handleWithdrawPrivately = () => {
    WithdrawController.selectNote(lastNote);
    router.push(`/withdraw?note=${lastNote.depositIndex}`);
  };

  const handleWithdrawPublicly = () => {
    RagequitController.selectNote(lastNote);
    router.push(`/ragequit?note=${lastNote.depositIndex}`);
  };

  const toUsdValue = (amount: string | bigint): number | null => {
    const ethAmount = formatEthAmount(amount, { maxDecimals: 6 });
    const ethAsNumber = Number.parseFloat(ethAmount);
    return usdPrice && !Number.isNaN(ethAsNumber) ? ethAsNumber * usdPrice : null;
  };

  const timelineEntries = buildTimelineEntries(noteChain);

  return (
    <ScreenLayout
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={
        <ScreenHeader
          title="Note Details"
          subtitle="Detail of your private deposit and withdrawals"
          onBack={onBack}
        />
      }
      footer={
        hasActions ? (
          <div className="flex flex-row gap-3">
            {canWithdrawPublicly && (
              <Button
                onClick={handleWithdrawPublicly}
                variant="outline"
                className="h-12 flex-1 rounded-xl border-white/10 text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white"
                size="lg"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Withdraw Publicly
              </Button>
            )}
            {canWithdrawPrivately && (
              <Button
                onClick={handleWithdrawPrivately}
                className="h-12 flex-1 rounded-xl text-sm font-semibold sm:text-base"
                size="lg"
              >
                <Lock className="mr-2 h-4 w-4" />
                Withdraw Privately
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Balance Summary */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="mb-1 text-sm font-medium text-neutral-400">Remaining Balance</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">
              {formatEthAmount(lastNote.amount, { maxDecimals: 6 })} ETH
            </span>
            {toUsdValue(lastNote.amount) !== null && (
              <span className="text-sm text-neutral-400">
                (~{formatUsdAmount(toUsdValue(lastNote.amount)!)})
              </span>
            )}
          </div>
        </div>

        {/* Status Section */}
        <Section title="Status">
          <Row label="Note" value={getNoteLabel(lastNote.originChainId, lastNote.depositIndex)} />
          <Row
            label="Status"
            value={
              <span
                className={`capitalize ${
                  lastNote.status === "merged"
                    ? "text-violet-400"
                    : lastNote.status === "spent"
                      ? "text-neutral-400"
                      : "text-emerald-400"
                }`}
              >
                {lastNote.status}
              </span>
            }
          />
          {lastNote.isCrossChain && lastNote.intentStatus && lastNote.intentStatus !== "filled" && (
            <Row
              label="Intent Status"
              value={
                <span
                  className={`capitalize ${lastNote.intentStatus === "pending" ? "text-yellow-400" : "text-orange-400"}`}
                >
                  {lastNote.intentStatus}
                </span>
              }
            />
          )}
          <Row
            label="ASP Status"
            value={
              <span
                className={`capitalize ${
                  lastNote.aspStatus === "approved"
                    ? "text-emerald-400"
                    : lastNote.aspStatus === "pending"
                      ? "text-blue-400"
                      : "text-red-400"
                }`}
              >
                {lastNote.aspStatus}
              </span>
            }
          />
        </Section>

        {/* History Section */}
        <Section title="History">
          <div className="px-3 py-2">
            <HistoryTimeline entries={timelineEntries} toUsdValue={toUsdValue} />
          </div>
        </Section>
      </div>
    </ScreenLayout>
  );
}
