/**
 * Activity Details Screen Component
 *
 * Full-screen view for displaying detailed activity information.
 */

import { ExternalLink, Info, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ACTIVITY_TYPE_LABELS, type Activity } from "@/types/activity";
import { getTxExplorerUrl, getChainName } from "@/config/chains";

type ActivityPendingReason = "waitingForSolver" | "awaitingApproval" | "rejected";

function getActivityPendingReason(activity: Activity): ActivityPendingReason | null {
  // Cross-chain not filled yet (no label)
  if (activity.isCrossChain && !activity.isActivated) {
    return "waitingForSolver";
  }

  // In pool but ASP pending
  if (activity.isActivated && activity.aspStatus === "pending") {
    return "awaitingApproval";
  }

  // In pool but ASP rejected
  if (activity.isActivated && activity.aspStatus === "rejected") {
    return "rejected";
  }

  return null;
}

interface ActivityDetailsScreenProps {
  activity: Activity | null;
  onBack: () => void;
}

export function ActivityDetailsScreen({ activity, onBack }: ActivityDetailsScreenProps) {
  if (!activity) return null;

  const originChainName = getChainName(activity.originChainId);
  const destChainName = getChainName(activity.destinationChainId);
  const isCrossChain = activity.isCrossChain;
  const pendingReason = getActivityPendingReason(activity);

  // Check if destination tx exists (for pending cross-chain, it might not)
  const hasDestinationTx = activity.destinationTransactionHash &&
    activity.destinationTransactionHash !== activity.originTransactionHash;

  // Format full timestamp
  const fullTimestamp = new Date(Number(activity.timestamp) * 1000).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <ScreenLayout
      header={
        <ScreenHeader title={`${ACTIVITY_TYPE_LABELS[activity.type]} Details`} onBack={onBack} />
      }
      containerClassName="h-[600px] w-full"
      contentClassName="px-4 py-4"
    >
      <div className="space-y-4">
        {/* Amount Card */}
        <div className="border-border bg-muted rounded-xl border p-4 text-center shadow">
          <p className="text-muted-foreground text-sm font-medium">Amount</p>
          <AmountDisplay
            amount={activity.amount}
            layout="stacked"
            ethOptions={{ maxDecimals: 6 }}
            ethClassName="text-2xl font-bold tabular-nums text-white"
            usdClassName="text-sm text-muted-foreground mt-1"
          />
        </div>

        {/* Pending Status Info */}
        {pendingReason === "waitingForSolver" && (
          <div className="rounded-xl border border-yellow-800 bg-yellow-900/20 p-3">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-200">Waiting for Solver</p>
                <p className="mt-0.5 text-xs text-yellow-400">
                  This cross-chain deposit is waiting to be filled by a solver. Once filled, it
                  will appear in your Available balance within ~5-10 minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {pendingReason === "awaitingApproval" && (
          <div className="rounded-xl border border-blue-800 bg-blue-900/20 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-200">Awaiting Approval</p>
                <p className="mt-0.5 text-xs text-blue-400">
                  This deposit is in the pool and awaiting compliance approval. Once approved, it
                  will be available for private withdrawal.
                </p>
              </div>
            </div>
          </div>
        )}

        {pendingReason === "rejected" && (
          <div className="rounded-xl border border-orange-800 bg-orange-900/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-orange-200">Compliance Rejected</p>
                <p className="mt-0.5 text-xs text-orange-400">
                  This deposit was not approved for private withdrawal. You can use Ragequit to
                  withdraw your funds without privacy protection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Details */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Transaction Details</h3>
          {isCrossChain ? (
            <div className="border-border bg-muted/50 space-y-2 rounded-lg border p-2 text-sm font-medium">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-1 flex-col items-center space-y-2">
                  <span className="text-muted-foreground font-medium">Origin</span>
                  <span className="text-center font-semibold text-white">{originChainName}</span>
                  <a
                    href={getTxExplorerUrl(activity.originChainId, activity.originTransactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    <span className="font-mono">
                      {activity.originTransactionHash.slice(0, 6)}...
                      {activity.originTransactionHash.slice(-4)}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <ArrowRight className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                <div className="flex flex-1 flex-col items-center space-y-2">
                  <span className="text-muted-foreground font-medium">Destination</span>
                  <span className="text-center font-semibold text-white">{destChainName}</span>
                  {hasDestinationTx ? (
                    <a
                      href={getTxExplorerUrl(
                        activity.destinationChainId,
                        activity.destinationTransactionHash
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                    >
                      <span className="font-mono">
                        {activity.destinationTransactionHash.slice(0, 6)}...
                        {activity.destinationTransactionHash.slice(-4)}
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">Pending</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-border bg-muted/50 space-y-2 rounded-lg border p-2 text-sm font-medium">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Chain</span>
                <span className="text-white">{originChainName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transaction</span>
                <a
                  href={getTxExplorerUrl(activity.originChainId, activity.originTransactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  <span className="font-mono">
                    {activity.originTransactionHash.slice(0, 6)}...
                    {activity.originTransactionHash.slice(-4)}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timestamp</span>
                <span className="text-right text-white">{fullTimestamp}</span>
              </div>
            </div>
          )}
        </div>

        {/* Note Details */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Note Details</h3>

          <div className="border-border bg-muted/50 space-y-2 rounded-lg border p-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Note Index</span>
              <span className="font-mono text-white">{activity.id}</span>
            </div>

            <div className="flex items-start justify-between">
              <span className="text-muted-foreground">Pool Address</span>
              <span className="break-all font-mono text-white">
                {activity.poolAddress.slice(0, 6)}...{activity.poolAddress.slice(-4)}
              </span>
            </div>

            {activity.label && (
              <div className="flex items-start justify-between">
                <span className="text-muted-foreground">Label</span>
                <span className="break-all font-mono text-white">
                  {activity.label.slice(0, 10)}...{activity.label.slice(-8)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Related Note Chain */}
        <div className="border-border bg-muted/50 flex items-center justify-between rounded-xl border p-2">
          <p className="text-sm font-medium text-white">Related Note Chain</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Navigate to notes page with this chain selected
            }}
            className="text-sm"
          >
            View Chain
          </Button>
        </div>
      </div>
    </ScreenLayout>
  );
}
