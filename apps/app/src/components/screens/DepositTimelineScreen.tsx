"use client";

import { CheckCircle, Clock, Hourglass, XCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { useTransactionTracking } from "@/hooks/useTransactionTracking";
import { getTxExplorerUrl } from "@/config/chains";
import { cn } from "@workspace/ui/lib/utils";
import { type AppError, getUserMessage, isUserCancellation } from "@/lib/errors/errors";

type DepositStatus = "submitting" | "confirming" | "confirmed-onchain" | "indexed" | "failed" | "error";
type StepStatus = "completed" | "active" | "pending" | "failed";

interface TimelineItem {
  label: string;
  status: StepStatus;
  description: string;
  errorMessage?: string;
  link?: { url: string; text: string };
}

interface DepositTimelineScreenProps {
  noteAmount: number;
  status: DepositStatus;
  txHash: string | null;
  error: AppError | null;
  failedReason: string | null;
  onClose: () => void;
}

export function DepositTimelineScreen({
  noteAmount,
  status,
  txHash,
  error,
  failedReason,
  onClose,
}: DepositTimelineScreenProps) {
  const { trackingStatus } = useTransactionTracking();
  const explorerUrl = txHash ? getTxExplorerUrl(1, txHash) : null;

  const isSubmitting = status === "submitting";
  const isConfirming = status === "confirming";
  const isConfirmedOnChain = status === "confirmed-onchain";
  const isIndexed = status === "indexed";
  const isFailed = status === "failed";
  const isError = status === "error";

  // Show indexing state while confirmed but not yet indexed
  const isIndexing = trackingStatus === "waiting" && isConfirmedOnChain;

  const isUserCancelled = error && isUserCancellation(error);
  const hasError = isUserCancelled || isFailed || isError;

  const title = isIndexed
    ? "Deposit complete"
    : hasError
      ? "Deposit failed"
      : isConfirmedOnChain || isIndexing
        ? "Confirming deposit"
        : isConfirming
          ? "Processing deposit"
          : isSubmitting
            ? "Confirm in wallet"
            : "Processing deposit";

  const subtitle = isIndexed
    ? "Your deposit is complete and ready for withdrawal."
    : hasError
      ? "Something went wrong. See details below."
      : isConfirmedOnChain || isIndexing
        ? "Almost done. Finalizing your deposit."
        : isConfirming
          ? "Waiting for confirmation."
          : isSubmitting
            ? "Please confirm in your wallet."
            : "This may take a few moments.";

  const failedAtStep = isUserCancelled
    ? "confirm"
    : isError
      ? "confirm"
      : isFailed
        ? "processing"
        : null;

  const confirmWalletStatus: StepStatus =
    failedAtStep === "confirm"
      ? "failed"
      : txHash || isConfirming || isConfirmedOnChain || isFailed
        ? "completed"
        : isSubmitting
          ? "active"
          : "pending";

  const processingStatus: StepStatus =
    failedAtStep === "processing"
      ? "failed"
      : isIndexed
        ? "completed"
        : isConfirming || isConfirmedOnChain || isIndexing
          ? "active"
          : confirmWalletStatus === "completed"
            ? "active"
            : "pending";

  const completeStatus: StepStatus = isIndexed ? "completed" : "pending";

  const getErrorMessage = (): string | undefined => {
    if (!hasError) return undefined;
    if (isUserCancelled) return "You cancelled the transaction.";
    if (isFailed) return failedReason || "Transaction failed on-chain.";
    if (error) return getUserMessage(error);
    return undefined;
  };

  const timeline: TimelineItem[] = [
    {
      label: "Confirm in wallet",
      status: confirmWalletStatus,
      description: "Approve the transaction in your wallet.",
      errorMessage: failedAtStep === "confirm" ? getErrorMessage() : undefined,
    },
    {
      label: "Processing deposit",
      status: processingStatus,
      description: "Confirming and securing your deposit.",
      errorMessage: failedAtStep === "processing" ? getErrorMessage() : undefined,
    },
    {
      label: "Deposit complete",
      status: completeStatus,
      description: "Your funds are ready for withdrawal.",
      link: explorerUrl && isIndexed ? { url: explorerUrl, text: "View receipt" } : undefined,
    },
  ];

  const StepIcon = ({ status }: { status: StepStatus }) => {
    if (status === "completed") return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (status === "active") return <Clock className="h-6 w-6 animate-pulse text-yellow-500" />;
    if (status === "failed") return <XCircle className="h-6 w-6 text-red-500" />;
    return <div className="h-6 w-6 rounded-full border-2 border-border" />;
  };

  const StatusIcon = () => {
    if (isIndexed) return <CheckCircle className="h-12 w-12 text-green-500" />;
    if (hasError) return <XCircle className="h-12 w-12 text-red-500" />;
    return <Hourglass className="h-12 w-12 animate-pulse text-muted-foreground" />;
  };

  // Back button only enabled after success or failure
  const canGoBack = isIndexed || hasError;

  const footerContent = (
    <Button
      onClick={onClose}
      className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
      size="lg"
    >
      Close
    </Button>
  );

  return (
    <ScreenLayout
      header={<ScreenHeader title="Transaction details" onBack={onClose} backDisabled={!canGoBack} />}
      footer={footerContent}
      contentClassName="space-y-4 px-6 py-4"
    >
      <div className="flex flex-1 flex-col items-center space-y-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <StatusIcon />
          <h2 className="text-2xl font-bold">{title}</h2>
          <span className="text-5xl font-extrabold">{noteAmount.toFixed(4)} ETH</span>
          <span className="text-sm font-medium text-muted-foreground">{subtitle}</span>
        </div>

        <div className="w-full max-w-md">
          <div className="relative space-y-6">
            {timeline.map((step, idx) => (
              <div key={idx} className="relative flex gap-4">
                {idx !== timeline.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[11px] top-6 h-full w-[2px]",
                      step.status === "completed"
                        ? "bg-green-100"
                        : step.status === "failed"
                          ? "bg-red-100"
                          : "bg-muted"
                    )}
                  />
                )}

                <div className="relative z-10">
                  <StepIcon status={step.status} />
                </div>

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
                        step.status === "pending" ? "text-muted-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {step.description}
                      {step.link && (
                        <>
                          {" "}
                          <a
                            href={step.link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-orange-500 hover:underline"
                          >
                            {step.link.text}
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
}
