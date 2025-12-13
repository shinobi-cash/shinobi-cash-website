// File: src/components/features/withdrawal/WithdrawalTimelineDrawer.tsx

import type { Note } from "@/lib/storage/types";
import { formatEthAmount, formatHash } from "@/utils/formatters";
import { Check, Copy, Info, Loader2, ArrowRight } from "lucide-react";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { memo, useCallback, useState } from "react";
import { Button } from "../../ui/button";
import { ResponsiveModal } from "../../ui/responsive-modal";

export interface WithdrawalStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "processing" | "completed" | "error";
  timestamp?: number;
  error?: string;
}

export const WITHDRAWAL_STEPS: WithdrawalStep[] = [
  {
    id: "validation",
    title: "Validating Request",
    description: "Checking note status, amounts, and recipient address...",
    status: "pending",
  },
  {
    id: "proof-generation",
    title: "Generating Privacy Proof",
    description: "Creating zero-knowledge proof to preserve anonymity...",
    status: "pending",
  },
  {
    id: "transaction-prep",
    title: "Preparing Transaction",
    description: "Building withdrawal transaction with smart account...",
    status: "pending",
  },
  { id: "ready", title: "Ready for Preview", description: "Withdrawal prepared successfully!", status: "pending" },
];

interface WithdrawalTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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
  currentStep: number; // Corrected prop
  showPreview: boolean;
  onShowPreview: () => void;
}

type DrawerMode = "timeline" | "preview";

export const WithdrawalTimelineDrawer = ({
  isOpen,
  onClose,
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
}: WithdrawalTimelineDrawerProps) => {
  const drawerMode: DrawerMode = showPreview ? "preview" : "timeline";

  const getTitle = () => {
    return drawerMode === "preview" ? "Transaction Preview" : "Withdrawal Progress";
  };

  const getDescription = () => {
    return drawerMode === "preview"
      ? "Review your withdrawal details before confirming"
      : "Preparing your privacy-preserving withdrawal";
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title={getTitle()}
      description={getDescription()}
      className="bg-app-background border-app"
    >
      {drawerMode === "timeline" ? (
        <TimelineView steps={steps} onClose={onClose} onShowPreview={onShowPreview} />
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
    </ResponsiveModal>
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
          <h3 className="text-lg font-semibold text-app-primary mb-2">Preparing Withdrawal</h3>
          <p className="text-sm text-app-secondary">Creating a privacy-preserving withdrawal transaction</p>
        </div>
        <ul className="-mb-8">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <li key={step.id}>
                <div className="relative pb-6">
                  {!isLast && (
                    <span className="absolute left-2 top-2 -ml-px h-full w-0.5 border border-app" aria-hidden="true" />
                  )}
                  <div className="relative flex items-start space-x-3">
                    <span className={getStatusDot(step)}>{getStepIcon(step)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-app-primary">{step.title}</span>
                        {getProcessingIndicator(step)}
                      </div>
                      <p className="text-xs text-app-secondary mt-1">{step.error || step.description}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-6">
          {hasError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-700 dark:text-red-300 text-center">
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
        <div className="bg-app-surface rounded-xl p-2 border border-app shadow-sm">
          <div className="text-center">
            <p className="text-sm font-medium text-app-secondary mb-1">You will receive</p>
            <p className="text-2xl font-bold text-app-primary tabular-nums">
              {formatEthAmount(youReceive, { decimals: 7 })} ETH
            </p>
          </div>
        </div>

        {/* Cross-Chain Flow - Show for cross-chain withdrawals */}
        {isCrossChain && destinationChainId && (
          <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
            <div className="px-2 py-2 border-b border-app bg-app-surface">
              <h3 className="text-sm font-semibold text-app-primary">Cross-Chain Flow</h3>
            </div>

            <div className="px-2 py-2">
              {/* Visual Flow */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs font-medium text-app-secondary mb-1">Origin</span>
                  <span className="text-xs font-semibold text-app-primary text-center">
                    {POOL_CHAIN.name}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-app-tertiary flex-shrink-0" />
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs font-medium text-app-secondary mb-1">Destination</span>
                  <span className="text-xs font-semibold text-app-primary text-center">
                    {SHINOBI_CASH_SUPPORTED_CHAINS.find(c => c.id === destinationChainId)?.name ?? `Chain ${destinationChainId}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee Breakdown */}
        <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
          <div className="px-2 py-2 border-b border-app">
            <h3 className="text-sm font-semibold text-app-primary">Fee Breakdown</h3>
          </div>
          <div className="divide-y divide-app-border">
            <div className="px-2 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-app-secondary">Note Balance</span>
              <span className="text-xs font-mono text-app-primary tabular-nums">
                {formatEthAmount(note.amount, { decimals: 7 })} ETH
              </span>
            </div>
            <div className="px-2 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-app-secondary">Withdrawal Amount</span>
              <span className="text-xs font-mono text-red-500 tabular-nums">
                -{formatEthAmount(withdrawAmountNum, { decimals: 7 })} ETH
              </span>
            </div>
            <div className="px-2 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-app-secondary">
                  {isCrossChain ? "Relay Fee (Max)" : "Execution Fee (Max)"}
                </span>
                <div className="group relative">
                  <Info className="h-3 w-3 text-app-tertiary hover:text-app-secondary cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                    {isCrossChain
                      ? "Fee paid to relayer for transaction execution. Unused portion refunded."
                      : "Maximum fee taken from withdrawal. Unused portion refunded to recipient."}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono text-red-500 tabular-nums">
                -{formatEthAmount(executionFee, { decimals: 7 })} ETH
              </span>
            </div>
            {isCrossChain && solverFee > 0 && (
              <div className="px-2 py-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-app-secondary">Solver Fee</span>
                  <div className="group relative">
                    <Info className="h-3 w-3 text-app-tertiary hover:text-app-secondary cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      Fee paid to solver for cross-chain intent fulfillment.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-red-500 tabular-nums">
                  -{formatEthAmount(solverFee, { decimals: 7 })} ETH
                </span>
              </div>
            )}
            {remainingBalance > 0 && (
              <div className="px-2 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Remaining in Note</span>
                <span className="text-xs font-mono text-app-primary tabular-nums">
                  {formatEthAmount(remainingBalance, { decimals: 7 })} ETH
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
          <div className="px-2 py-2 border-b border-app">
            <h3 className="text-sm font-semibold text-app-primary">Recipient Details</h3>
          </div>
          <div className="divide-y divide-app-border">
            <div className="px-2 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-app-secondary">To Address</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-app-primary">{formatHash(recipientAddress)}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(recipientAddress, "Recipient Address")}
                  className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                  title={copiedField === "Recipient Address" ? "Copied!" : "Copy recipient address"}
                >
                  {copiedField === "Recipient Address" ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
          className="w-full h-11 rounded-xl text-sm font-medium"
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
