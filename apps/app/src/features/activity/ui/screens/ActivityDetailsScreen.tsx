/**
 * Activity Details Screen Component
 *
 * Full-screen view for displaying detailed activity information.
 */

import { ChevronLeft, ExternalLink, Info, ArrowRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { ACTIVITY_TYPE_LABELS, type Activity } from "../../types";
import { getTxExplorerUrl, getChainName } from "@/config/chains";

interface ActivityDetailsScreenProps {
  activity: Activity | null;
  onBack: () => void;
}

export function ActivityDetailsScreen({ activity, onBack }: ActivityDetailsScreenProps) {
  if (!activity) return null;

  const originChainName = getChainName(activity.originChainId);
  const destChainName = getChainName(activity.destinationChainId);
  const isCrossChain = activity.isCrossChain;

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
    <div className="flex h-[550px] w-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="hover:bg-app-surface-hover h-8 w-8 p-0 transition-colors duration-200"
          aria-label="Go back"
        >
          <ChevronLeft className="text-app-secondary h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-white">
            {ACTIVITY_TYPE_LABELS[activity.type]} Details
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {/* Amount Card */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center shadow">
            <p className="text-sm font-medium text-gray-400">Amount</p>
            <AmountDisplay
              amount={activity.amount}
              layout="stacked"
              ethOptions={{ maxDecimals: 6 }}
              ethClassName="text-2xl font-bold tabular-nums text-white"
              usdClassName="text-sm text-gray-400 mt-1"
            />
          </div>

          {/* Pending Activity Info */}
          {!activity.isActivated && (
            <div className="rounded-xl border border-yellow-800 bg-yellow-900/20 p-2">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-yellow-200">Pending</p>
                  <p className="mt-0.5 text-xs text-yellow-400">
                    {isCrossChain
                      ? "This cross-chain transaction is waiting to be filled by a solver."
                      : "This transaction is pending asp approval."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">Transaction Details</h3>
            {isCrossChain ? (
              <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-800/50 p-2 text-sm font-medium">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-1 flex-col items-center space-y-2">
                    <span className="font-medium text-gray-400">Origin</span>
                    <span className="text-center font-semibold text-white">{originChainName}</span>
                    <a
                      href={getTxExplorerUrl(
                        activity.originChainId,
                        activity.originTransactionHash
                      )}
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
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  <div className="flex flex-1 flex-col items-center space-y-2">
                    <span className="font-medium text-gray-400">Destination</span>
                    <span className="text-center font-semibold text-white">{destChainName}</span>
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
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-800/50 p-2 text-sm font-medium">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{isCrossChain ? "Origin Chain" : "Chain"}</span>
                  <span className="text-white">{originChainName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Transaction</span>
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
                  <span className="text-gray-400">Timestamp</span>
                  <span className="text-right text-white">{fullTimestamp}</span>
                </div>
              </div>
            )}
          </div>

          {/* Note Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">Note Details</h3>

            <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-800/50 p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Note Index</span>
                <span className="font-mono text-white">{activity.id}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-gray-400">Pool Address</span>
                <span className="break-all font-mono text-white">
                  {activity.poolAddress.slice(0, 6)}...{activity.poolAddress.slice(-4)}
                </span>
              </div>

              {activity.label && (
                <div className="flex items-start justify-between">
                  <span className="text-gray-400">Label</span>
                  <span className="break-all font-mono text-white">
                    {activity.label.slice(0, 10)}...{activity.label.slice(-8)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Related Note Chain */}
          <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/50 p-2">
            <p className="text-sm font-medium text-white">Related Note Chain</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Navigate to notes page with this chain selected
                console.log("View note chain:", activity.depositIndex);
              }}
              className="text-sm"
            >
              View Chain
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
