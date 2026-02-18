/**
 * Note Chain Screen Component
 * Full-screen view for displaying note tree details with transaction timeline
 */

import { useRouter } from "next/navigation";
import type { NoteTree } from "@shinobi-cash/core/discovery";
import {
  getSpendableLeaves,
  isSpendableNote,
  isIntentNote,
  canWithdraw,
  canRagequit,
  getTotalSpendableBalance,
} from "@shinobi-cash/core/discovery";
import { formatEthAmount, formatUsdAmount } from "@/utils/formatters";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Section, Row } from "@/components/shared/Section";
import { usePriceData } from "@/hooks/usePriceData";
import { WithdrawController } from "@/controllers/WithdrawController";
import { RagequitController } from "@/controllers/RagequitController";
import { HistoryTimeline } from "./HistoryTimeline";
import { buildTimelineEntries } from "./utils";

interface NoteChainScreenProps {
  noteTree: NoteTree | null;
  onBack: () => void;
}

export function NoteChainScreen({ noteTree, onBack }: NoteChainScreenProps) {
  const router = useRouter();
  const { usdPrice } = usePriceData("ETH");

  if (!noteTree) return null;

  // Get spendable leaves to determine available actions
  const spendableLeaves = getSpendableLeaves(noteTree);
  const firstSpendableNote = spendableLeaves.length > 0 ? spendableLeaves[0].note : null;

  // Check if any spendable note can be withdrawn/ragequit
  const canWithdrawPrivately = spendableLeaves.some((node) => canWithdraw(node.note));
  const canWithdrawPublicly = spendableLeaves.some((node) => canRagequit(node.note));
  const hasActions = canWithdrawPrivately || canWithdrawPublicly;

  // Calculate total remaining balance
  const remainingBalance = getTotalSpendableBalance(noteTree);

  const handleWithdrawPrivately = () => {
    if (!firstSpendableNote) return;
    WithdrawController.selectNote(firstSpendableNote);
    router.push(`/withdraw?note=${firstSpendableNote.depositIndex}`);
  };

  const handleWithdrawPublicly = () => {
    if (!firstSpendableNote) return;
    RagequitController.selectNote(firstSpendableNote);
    router.push(`/ragequit?note=${firstSpendableNote.depositIndex}`);
  };

  const toUsdValue = (amount: string | bigint): number | null => {
    const ethAmount = formatEthAmount(amount, { maxDecimals: 6 });
    const ethAsNumber = Number.parseFloat(ethAmount);
    return usdPrice && !Number.isNaN(ethAsNumber) ? ethAsNumber * usdPrice : null;
  };

  const timelineEntries = buildTimelineEntries(noteTree);

  // Use root note for display info
  const rootNote = noteTree.root.note;
  const displayNote = firstSpendableNote ?? rootNote;

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
                Ragequit
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
              {formatEthAmount(remainingBalance, { maxDecimals: 6 })} ETH
            </span>
            {toUsdValue(remainingBalance) !== null && (
              <span className="text-sm text-neutral-400">
                (~{formatUsdAmount(toUsdValue(remainingBalance)!)})
              </span>
            )}
          </div>
        </div>

        {/* Status Section */}
        <Section title="Status">
          <Row
            label="Serial"
            value={<span className="font-mono">{displayNote.serialNumber}</span>}
          />
          {isSpendableNote(displayNote) && (
            <>
              <Row
                label="Status"
                value={
                  <span
                    className={`capitalize ${
                      displayNote.status === "spent" ? "text-neutral-400" : "text-emerald-400"
                    }`}
                  >
                    {displayNote.status}
                  </span>
                }
              />
              <Row
                label="ASP Status"
                value={
                  <span
                    className={`capitalize ${
                      displayNote.aspStatus === "approved"
                        ? "text-emerald-400"
                        : displayNote.aspStatus === "pending"
                          ? "text-blue-400"
                          : "text-red-400"
                    }`}
                  >
                    {displayNote.aspStatus}
                  </span>
                }
              />
            </>
          )}
          {isIntentNote(displayNote) && (
            <Row
              label="Intent Status"
              value={<span className="capitalize text-yellow-400">Pending</span>}
            />
          )}
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
