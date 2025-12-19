/**
 * Withdrawal Timeline Screen Component
 * Full-screen view for withdrawal progress and preview
 */

import type { Note } from "@/lib/storage/types";
import { formatEthAmount, formatHash } from "@/utils/formatters";
import { Check, Copy, Info, Loader2, ArrowRight } from "lucide-react";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { memo, useCallback, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { BackButton } from "../../ui/back-button";

export interface WithdrawalStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "processing" | "completed" | "error";
  timestamp?: number;
  error?: string;
}

interface WithdrawalTimelineScreenProps {
  onBack: () => void;
  onConfirm: () => void;
  note: Note;
  withdrawAmount: string;
  recipientAddress: string;
  destinationChainId?: number;
  executionFee: number;
  solverFee: number;
  youReceive: number;
  remainingBalance: number;
  isProcessing: boolean;
  isCrossChain: boolean;
  steps: WithdrawalStep[];
  showPreview: boolean;
  onShowPreview: () => void;
}

type ScreenMode = "timeline" | "preview";

export const WithdrawalTimelineScreen = ({
  onBack,
  onConfirm,
  note,
  withdrawAmount,
  recipientAddress,
  destinationChainId,
  executionFee,
  solverFee,
  youReceive,
  remainingBalance,
  isProcessing,
  isCrossChain,
  steps,
  showPreview,
  onShowPreview,
}: WithdrawalTimelineScreenProps) => {
  const screenMode: ScreenMode = showPreview ? "preview" : "timeline";

  const getTitle = () => {
    return screenMode === "preview" ? "Transaction Preview" : "Withdrawal Progress";
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <BackButton onClick={onBack} />
        <div>
          <h2 className="text-lg font-semibold text-white">{getTitle()}</h2>
          <p className="text-xs text-gray-400">
            {screenMode === "preview"
              ? "Review your withdrawal details before confirming"
              : "Preparing your privacy-preserving withdrawal"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {screenMode === "timeline" ? (
          <TimelineView steps={steps} onClose={onBack} onShowPreview={onShowPreview} />
        ) : (
          <PreviewView
            note={note}
            withdrawAmount={withdrawAmount}
            recipientAddress={recipientAddress}
            destinationChainId={destinationChainId}
            executionFee={executionFee}
            solverFee={solverFee}
            youReceive={youReceive}
            remainingBalance={remainingBalance}
            isProcessing={isProcessing}
            isCrossChain={isCrossChain}
            onConfirm={onConfirm}
          />
        )}
      </div>
    </div>
  );
};

// Sub-component for Timeline View
const TimelineView = memo(
  ({
    steps,
    onClose,
    onShowPreview,
  }: {
    steps: WithdrawalStep[];
    onClose: () => void;
    onShowPreview: () => void;
  }) => {
    const allStepsCompleted = steps.every((step) => step.status === "completed");
    const hasError = steps.some((step) => step.status === "error");

    const getStepIcon = useCallback((step: WithdrawalStep) => {
      if (step.status === "completed") return <div className="w-2 h-2 bg-white rounded-full" />;
      if (step.status === "processing") return <div className="w-2 h-2 bg-white rounded-full animate-pulse" />;
      if (step.status === "error") return <div className="w-2 h-2 bg-white rounded-full" />;
      return null;
    }, []);

    const getStatusDot = useCallback((step: WithdrawalStep) => {
      const baseClasses = "h-4 w-4 rounded-full flex items-center justify-center";
      switch (step.status) {
        case "completed":
          return `${baseClasses} bg-green-500`;
        case "processing":
          return `${baseClasses} bg-blue-500 animate-pulse`;
        case "error":
          return `${baseClasses} bg-red-500`;
        default:
          return `${baseClasses} bg-gray-300`;
      }
    }, []);

    const getProcessingIndicator = useCallback((step: WithdrawalStep) => {
      if (step.status !== "processing") return null;
      return (
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]" />
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
        </div>
      );
    }, []);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Preparing Withdrawal</h3>
          <p className="text-sm text-gray-400">Creating a privacy-preserving withdrawal transaction</p>
        </div>
        <ul className="-mb-8">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <li key={step.id}>
                <div className="relative pb-6">
                  {!isLast && (
                    <span className="absolute left-2 top-2 -ml-px h-full w-0.5 border border-gray-700" aria-hidden="true" />
                  )}
                  <div className="relative flex items-start space-x-3">
                    <span className={getStatusDot(step)}>{getStepIcon(step)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white">{step.title}</span>
                        {getProcessingIndicator(step)}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{step.error || step.description}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-6">
          {hasError && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-300 text-center">
                Withdrawal preparation failed. Please try again.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" size="lg">
              Cancel
            </Button>
            <Button onClick={onShowPreview} disabled={!allStepsCompleted} className="flex-1" size="lg">
              Preview Withdrawal
            </Button>
          </div>
        </div>
      </div>
    );
  },
);
TimelineView.displayName = "TimelineView";

// Sub-component for Preview View
const PreviewView = memo(
  ({
    note,
    withdrawAmount,
    recipientAddress,
    destinationChainId,
    executionFee,
    solverFee,
    youReceive,
    remainingBalance,
    isProcessing,
    isCrossChain,
    onConfirm,
  }: {
    note: Note;
    withdrawAmount: string;
    recipientAddress: string;
    destinationChainId?: number;
    executionFee: number;
    solverFee: number;
    youReceive: number;
    remainingBalance: number;
    isProcessing: boolean;
    isCrossChain: boolean;
    onConfirm: () => void;
  }) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const withdrawAmountNum = Number.parseFloat(withdrawAmount) || 0;

    const copyToClipboard = useCallback(async (text: string, fieldName: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
      } catch (error) {
        console.warn("Copy failed:", error);
      }
    }, []);

    return (
      <div className="space-y-4">
        {/* Amount Section */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-sm">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-400 mb-1">You will receive</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {formatEthAmount(youReceive, { decimals: 7 })} ETH
            </p>
          </div>
        </div>

        {/* Cross-Chain Flow */}
        {isCrossChain && destinationChainId && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Cross-Chain Flow</h3>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs font-medium text-gray-400 mb-1">Origin</span>
                  <span className="text-xs font-semibold text-white text-center">
                    {POOL_CHAIN.name}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs font-medium text-gray-400 mb-1">Destination</span>
                  <span className="text-xs font-semibold text-white text-center">
                    {SHINOBI_CASH_SUPPORTED_CHAINS.find(c => c.id === destinationChainId)?.name ?? `Chain ${destinationChainId}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee Breakdown */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">Fee Breakdown</h3>
          </div>
          <div className="divide-y divide-gray-700">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Note Balance</span>
              <span className="text-sm font-mono text-white tabular-nums">
                {formatEthAmount(note.amount, { decimals: 7 })} ETH
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Withdrawal Amount</span>
              <span className="text-sm font-mono text-red-400 tabular-nums">
                -{formatEthAmount(withdrawAmountNum, { decimals: 7 })} ETH
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-400">
                  {isCrossChain ? "Relay Fee (Max)" : "Execution Fee (Max)"}
                </span>
                <div className="group relative">
                  <Info className="h-3 w-3 text-gray-500 hover:text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                    {isCrossChain
                      ? "Fee paid to relayer for transaction execution. Unused portion refunded."
                      : "Maximum fee taken from withdrawal. Unused portion refunded to recipient."}
                  </div>
                </div>
              </div>
              <span className="text-sm font-mono text-red-400 tabular-nums">
                -{formatEthAmount(executionFee, { decimals: 7 })} ETH
              </span>
            </div>
            {isCrossChain && solverFee > 0 && (
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-gray-400">Solver Fee</span>
                  <div className="group relative">
                    <Info className="h-3 w-3 text-gray-500 hover:text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      Fee paid to solver for cross-chain intent fulfillment.
                    </div>
                  </div>
                </div>
                <span className="text-sm font-mono text-red-400 tabular-nums">
                  -{formatEthAmount(solverFee, { decimals: 7 })} ETH
                </span>
              </div>
            )}
            {remainingBalance > 0 && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Remaining in Note</span>
                <span className="text-sm font-mono text-white tabular-nums">
                  {formatEthAmount(remainingBalance, { decimals: 7 })} ETH
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Recipient Details */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">Recipient Details</h3>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">To Address</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono text-white">{formatHash(recipientAddress)}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(recipientAddress, "Recipient Address")}
                className="p-1 rounded-md hover:bg-gray-700 transition-colors duration-200"
                title={copiedField === "Recipient Address" ? "Copied!" : "Copy recipient address"}
              >
                {copiedField === "Recipient Address" ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
          className="w-full h-12 rounded-xl text-base font-semibold"
          size="lg"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          ) : (
            "Confirm Withdrawal"
          )}
        </Button>
      </div>
    );
  },
);
PreviewView.displayName = "PreviewView";
