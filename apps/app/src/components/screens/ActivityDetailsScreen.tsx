/**
 * Activity Details Screen Component
 *
 * Clean, focused view of activity details.
 * Uses status fields directly for concise display.
 */

import { ExternalLink, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { CopyableText } from "@/components/shared/CopyableText";
import { ACTIVITY_TYPE_LABELS, type ActivityEntry } from "@/types/activity";
import { getTxExplorerUrl, getChainName } from "@/config/chains";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";

interface ActivityDetailsScreenProps {
  entry: ActivityEntry | null;
  onBack: () => void;
  onViewNoteChain?: (depositIndex: number) => void;
}

export function ActivityDetailsScreen({ entry, onBack, onViewNoteChain }: ActivityDetailsScreenProps) {
  if (!entry) return null;

  const { note, type, displayAmount, isCrossChain } = entry;
  const { activityData } = note;

  const originChain = getChainName(note.originChainId);
  const destChain = getChainName(note.destinationChainId);

  // Check if we have fees to show
  const fees = {
    vetting: activityData.vettingFeeAmount,
    relay: activityData.relayFeeAmount,
    solver: activityData.solverFeeAmount,
  };
  const hasFees = Object.values(fees).some((f) => f && BigInt(f) > BigInt(0));

  return (
    <ScreenLayout
      header={<ScreenHeader title={`${ACTIVITY_TYPE_LABELS[type]} Details`} onBack={onBack} />}
      containerClassName="h-[600px] w-full"
      contentClassName="px-4 py-4 overflow-y-auto"
      footer={
        <Button
          onClick={() => onViewNoteChain?.(note.depositIndex)}
          disabled={!onViewNoteChain}
          className="w-full h-12 rounded-xl text-base font-semibold"
          size="lg"
        >
          View Note Chain
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Amount & Status Card */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-center">
            <AmountDisplay
              amount={displayAmount}
              layout="stacked"
              ethOptions={{ maxDecimals: 6 }}
              ethClassName="text-3xl font-bold tabular-nums text-white"
              usdClassName="text-sm text-neutral-400 mt-1"
            />
          </div>

          {/* Status badges */}
          <div className="mt-3 flex justify-center gap-2">
            {activityData.isSponsored && (
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                Sponsored
              </span>
            )}
            {isCrossChain && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400">
                {originChain} <ArrowRight className="h-3 w-3" /> {destChain}
              </span>
            )}
          </div>
        </div>

        {/* Transaction Info */}
        <Section title="Transaction">
          <Row label="Time" value={formatTimestamp(note.timestamp)} />
          <Row label="Chain" value={isCrossChain ? `${originChain} → ${destChain}` : originChain} />
          <Row
            label="Tx Hash"
            value={
              <a
                href={getTxExplorerUrl(note.destinationChainId, note.destinationTransactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <CopyableText
                  text={note.destinationTransactionHash}
                  truncateStart={8}
                  truncateEnd={6}
                  showIcon={false}
                  className="text-blue-400"
                />
                <ExternalLink className="h-3 w-3" />
              </a>
            }
          />
          {type === "deposit" && activityData.user && (
            <Row label="Depositor" value={<CopyableText text={activityData.user} />} />
          )}
          {type === "withdrawal" && activityData.recipient && (
            <Row label="Recipient" value={<CopyableText text={activityData.recipient} />} />
          )}
        </Section>

        {/* Fees (if any) */}
        {hasFees && (
          <Section title="Fees">
            {fees.vetting && BigInt(fees.vetting) > BigInt(0) && (
              <Row
                label="Compliance"
                value={<span className="text-orange-400">-{formatEthAmount(fees.vetting, { maxDecimals: 6 })} ETH</span>}
              />
            )}
            {fees.relay && BigInt(fees.relay) > BigInt(0) && (
              <Row
                label="Relay"
                value={<span className="text-orange-400">-{formatEthAmount(fees.relay, { maxDecimals: 6 })} ETH</span>}
              />
            )}
            {fees.solver && BigInt(fees.solver) > BigInt(0) && (
              <Row
                label="Solver"
                value={<span className="text-orange-400">-{formatEthAmount(fees.solver, { maxDecimals: 6 })} ETH</span>}
              />
            )}
          </Section>
        )}

        {/* Note Info */}
        <Section title="Note">
          <Row label="Index" value={<span className="font-mono">{note.depositIndex}-{note.changeIndex}</span>} />
          <Row label="Pool" value={<CopyableText text={note.poolAddress} />} />
          {note.label && (!note.isCrossChain || note.intentStatus === 'filled') && (
            <Row label="Label" value={<CopyableText text={note.label} truncateStart={10} truncateEnd={8} />} />
          )}
          {note.isCrossChain && note.intentStatus && note.intentStatus !== "filled" && (
            <Row
              label="Intent Status"
              value={
                <span className={`capitalize ${note.intentStatus === "pending" ? "text-yellow-400" : "text-orange-400"}`}>
                  {note.intentStatus}
                </span>
              }
            />
          )}
          {note.aspStatus !== "approved" && (
            <Row
              label="ASP Status"
              value={
                <span className={`capitalize ${note.aspStatus === "pending" ? "text-blue-400" : "text-red-400"}`}>
                  {note.aspStatus}
                </span>
              }
            />
          )}
        </Section>
      </div>
    </ScreenLayout>
  );
}

// Helper components

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}


