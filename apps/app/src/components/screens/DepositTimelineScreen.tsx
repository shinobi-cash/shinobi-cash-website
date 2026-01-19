"use client";

import { CheckCircle, Clock, Hourglass, XCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { useTransactionTracking } from "@/hooks/useTransactionTracking";
import { getTxExplorerUrl } from "@/config/chains";
import { cn } from "@workspace/ui/lib/utils";
import { getUserMessage, isUserCancellation } from "@/lib/errors/errorHandler";

interface DepositTimelineScreenProps {
  noteAmount: number;
  isWalletSubmitting: boolean;
  walletError: string | null;
  onClose: () => void;
}

type StepStatus = "completed" | "active" | "pending" | "failed";

interface TimelineItem {
  label: string;
  status: StepStatus;
  description: string;
  errorMessage?: string;
}

export function DepositTimelineScreen({
  noteAmount,
  isWalletSubmitting,
  walletError,
  onClose,
}: DepositTimelineScreenProps) {
  // Timeline UI tracks *privacy indexing only*
  // On-chain confirmation is owned by DepositController (confirmed-onchain state)
  const { trackingStatus, trackedTxHash, trackedChainId } = useTransactionTracking();

  const explorerUrl =
    trackedTxHash && trackedChainId ? getTxExplorerUrl(trackedChainId, trackedTxHash) : null;

  // Privacy indexer status (NOT on-chain confirmation)
  const isIndexing = trackingStatus === "waiting";
  const isIndexed = trackingStatus === "synced"; // Privacy pool has indexed the deposit
  const isOnChainFailed = trackingStatus === "failed";
  const isWalletCancelled = walletError && isUserCancellation(walletError);

  // ----- Hero copy -----

  const title = isIndexed
    ? "Deposit confirmed"
    : isWalletCancelled
      ? "Transaction cancelled"
      : isOnChainFailed
        ? "Deposit failed"
        : isWalletSubmitting
          ? "Confirm in wallet"
          : "Processing deposit";

  const subtitle = isIndexed
    ? "Your deposit note has been created and secured privately."
    : isWalletCancelled
      ? "You cancelled the transaction in your wallet."
      : isOnChainFailed
        ? getUserMessage(walletError)
        : isWalletSubmitting
          ? "Please confirm the transaction in your wallet."
          : "This usually takes a few moments.";

  // ----- Timeline -----

  const timeline: TimelineItem[] = [
    {
      label: "Wallet confirmation",
      status: isWalletCancelled
        ? "failed"
        : trackedTxHash
          ? "completed"
          : isWalletSubmitting
            ? "active"
            : "pending",
      description: "Approve the deposit transaction in your wallet.",
      errorMessage: isWalletCancelled ? getUserMessage(walletError) : undefined,
    },
    {
      label: "Transaction submitted",
      status: isOnChainFailed
        ? "failed"
        : trackedTxHash
          ? isIndexing || isIndexed
            ? "completed"
            : "active"
          : "pending",
      description: "Your transaction is broadcast to the network.",
    },
    {
      label: "Deposit indexing",
      status: isIndexed ? "completed" : isIndexing ? "active" : "pending",
      description: "Your deposit note is indexed privately.",
    },
    {
      label: "Deposit secured",
      status: isIndexed ? "completed" : "pending",
      description: "Your funds are now secured and ready for private withdrawal.",
    },
  ];

  // ----- Icons -----

  const StepIcon = ({ status }: { status: StepStatus }) => {
    if (status === "completed") return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (status === "active") return <Clock className="h-6 w-6 text-yellow-500" />;
    if (status === "failed") return <XCircle className="h-6 w-6 text-red-500" />;
    return <div className="h-6 w-6 rounded-full border-2 border-gray-200" />;
  };

  const StatusIcon = () => {
    if (isIndexed) return <CheckCircle className="h-12 w-12 text-green-500" />;
    if (isWalletCancelled || isOnChainFailed) return <XCircle className="h-12 w-12 text-red-500" />;
    return <Hourglass className="h-12 w-12 text-gray-300" />;
  };

  return (
    <ScreenLayout
      header={<ScreenHeader title="Transaction details" onBack={onClose} />}
      contentClassName="space-y-4 px-6 py-4"
    >
      <div className="flex flex-1 flex-col items-center space-y-4">
        {/* Hero */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <StatusIcon />

          <h2 className="text-2xl font-bold">{title}</h2>

          <span className="text-5xl font-extrabold">{noteAmount.toFixed(4)} ETH</span>

          <span className="text-sm font-medium text-gray-500">{subtitle}</span>
        </div>

        {/* Timeline */}
        <div className="w-full max-w-md">
          <div className="relative space-y-6">
            {timeline.map((step, idx) => (
              <div key={idx} className="relative flex gap-4">
                {/* Connector */}
                {idx !== timeline.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[11px] top-6 h-full w-[2px]",
                      step.status === "completed"
                        ? "bg-green-100"
                        : step.status === "failed"
                          ? "bg-red-100"
                          : "bg-gray-100"
                    )}
                  />
                )}

                {/* Icon */}
                <div className="relative z-10">
                  <StepIcon status={step.status} />
                </div>

                {/* Text */}
                <div className="flex flex-col gap-1">
                  <h3
                    className={cn("font-semibold", step.status === "failed" ? "text-red-600" : "")}
                  >
                    {step.label}
                  </h3>

                  {step.errorMessage ? (
                    <p className="text-sm text-red-600">{step.errorMessage}</p>
                  ) : (
                    <p
                      className={cn(
                        "text-sm",
                        step.status === "pending" ? "text-gray-300" : "text-gray-500"
                      )}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-4">
        {/* Confirm Button */}
        <Button
          onClick={onClose}
          className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
          size="lg"
        >
          Close
        </Button>

        {explorerUrl && !isWalletSubmitting && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-gray-900 hover:underline"
          >
            View receipt
          </a>
        )}
      </div>
    </ScreenLayout>
  );
}
