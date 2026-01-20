"use client";

import { CheckCircle, Clock, Hourglass, XCircle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { type AppError, getUserMessage, ErrorCode } from "@/lib/errors/errors";
import { EnginePhase } from "@/services/WithdrawalOrchestratorService";
import type { TrackingStatus } from "@/hooks/useTransactionTracking";
import { getTxExplorerUrl } from "@/config/chains";
import { POOL_CHAIN } from "@shinobi-cash/constants";

type StepStatus = "completed" | "active" | "pending" | "failed";

interface TimelineItem {
  label: string;
  status: StepStatus;
  description: string;
  errorMessage?: string;
  link?: { url: string; text: string };
}

interface WithdrawalTimelineProps {
  amount: number;
  currentPhase: EnginePhase | null;
  txHash: string | null;
  error: AppError | null;
  isConfirmed: boolean;
  isIndexed: boolean;
  trackingStatus: TrackingStatus;
}

export function WithdrawalTimeline({
  amount,
  currentPhase,
  txHash,
  error,
  isConfirmed,
  isIndexed,
  trackingStatus,
}: WithdrawalTimelineProps) {
  const explorerUrl = txHash ? getTxExplorerUrl(POOL_CHAIN.id, txHash) : null;

  const isPreparing = currentPhase !== null && currentPhase !== "prepared";
  const isConfirming = txHash !== null && !isConfirmed && !error;
  const isIndexing = trackingStatus === "waiting" && isConfirmed;

  const title = isIndexed
    ? "Withdrawal complete"
    : error
      ? "Withdrawal failed"
      : isIndexing
        ? "Finalizing withdrawal"
        : isConfirmed
          ? "Withdrawal confirmed"
          : isConfirming
            ? "Processing withdrawal"
            : isPreparing
              ? "Preparing withdrawal"
              : "Processing withdrawal";

  const subtitle = isIndexed
    ? "Your withdrawal is complete and notes have been updated."
    : error
      ? "Something went wrong. Please check the details below."
      : isIndexing
        ? "Almost done. Syncing your notes."
        : isConfirmed
          ? "Transaction confirmed. Waiting for indexer."
          : isConfirming
            ? "Waiting for transaction confirmation."
            : isPreparing
              ? "Generating zero-knowledge proof. This may take 5-10 seconds."
              : "Submitting your withdrawal transaction.";

  const isPreparationError =
    error &&
    (error.code === ErrorCode.WITHDRAWAL.FEE_ESTIMATION_FAILED ||
      error.code === ErrorCode.WITHDRAWAL.PRECONDITION ||
      error.code === ErrorCode.WITHDRAWAL.CONTEXT_FAILED ||
      error.code === ErrorCode.WITHDRAWAL.WITNESS_FAILED ||
      error.code === ErrorCode.WITHDRAWAL.PROOF_FAILED);

  const isTransactionError = error && error.code === ErrorCode.WITHDRAWAL.TRANSACTION_FAILED;

  // Combined preparation + submission step status
  const prepareSubmitStatus: StepStatus = isPreparationError
    ? "failed"
    : isTransactionError
      ? "failed"
      : txHash
        ? "completed"
        : isPreparing || currentPhase === "prepared"
          ? "active"
          : "pending";

  // Processing step status (confirming + indexing)
  const processingStatus: StepStatus = isIndexed
    ? "completed"
    : isConfirmed || isIndexing
      ? "active"
      : prepareSubmitStatus === "completed"
        ? "active"
        : "pending";

  const getErrorMessage = (): string | undefined => {
    if (isPreparationError) return getUserMessage(error);
    if (isTransactionError) return getUserMessage(error);
    return undefined;
  };

  const timeline: TimelineItem[] = [
    {
      label: "Preparing withdrawal",
      status: prepareSubmitStatus,
      description: "Generating proof and submitting transaction.",
      errorMessage: prepareSubmitStatus === "failed" ? getErrorMessage() : undefined,
    },
    {
      label: "Processing withdrawal",
      status: processingStatus,
      description: "Confirming and syncing your notes.",
    },
    {
      label: "Withdrawal complete",
      status: isIndexed ? "completed" : "pending",
      description: "Funds sent to recipient.",
      link: explorerUrl && isIndexed ? { url: explorerUrl, text: "View receipt" } : undefined,
    },
  ];

  const StepIcon = ({ status }: { status: StepStatus }) => {
    if (status === "completed") return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (status === "active") return <Clock className="h-6 w-6 animate-pulse text-yellow-500" />;
    if (status === "failed") return <XCircle className="h-6 w-6 text-red-500" />;
    return <div className="border-border h-6 w-6 rounded-full border-2" />;
  };

  const StatusIcon = () => {
    if (isIndexed) return <CheckCircle className="h-12 w-12 text-green-500" />;
    if (error) return <XCircle className="h-12 w-12 text-red-500" />;
    return <Hourglass className="text-muted-foreground h-12 w-12 animate-pulse" />;
  };

  return (
    <div className="flex flex-1 flex-col items-center space-y-4">
      <div className="flex flex-col items-center space-y-4 text-center">
        <StatusIcon />
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className="text-5xl font-extrabold">{amount.toFixed(4)} ETH</span>
        <span className="text-muted-foreground text-sm font-medium">{subtitle}</span>
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
                <h3 className={cn("font-semibold", step.status === "failed" ? "text-red-600" : "")}>
                  {step.label}
                </h3>
                {step.errorMessage ? (
                  <p className="text-sm text-red-600">{step.errorMessage}</p>
                ) : (
                  <p
                    className={cn(
                      "text-sm",
                      step.status === "pending"
                        ? "text-muted-foreground/70"
                        : "text-muted-foreground"
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
  );
}
