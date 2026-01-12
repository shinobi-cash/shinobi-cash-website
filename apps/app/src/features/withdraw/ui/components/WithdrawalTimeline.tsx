"use client";

import { CheckCircle, Clock, Hourglass, XCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { getUserMessage } from "@/lib/errors/errorHandler";
import { getTxExplorerUrl } from "@/config/chains";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import type { EnginePhase } from "../../engine/WithdrawalEngine";

type StepStatus = "completed" | "active" | "pending" | "failed";

interface TimelineItem {
  label: string;
  status: StepStatus;
  description: string;
  errorMessage?: string;
}

interface WithdrawalTimelineProps {
  amount: number;
  currentPhase: EnginePhase | null;
  txHash: string | null;
  error: { type: string; message: string } | null;
  isConfirmed: boolean;
  onClose: () => void;
}

export function WithdrawalTimeline({
  amount,
  currentPhase,
  txHash,
  error,
  isConfirmed,
  onClose,
}: WithdrawalTimelineProps) {
  const explorerUrl = txHash ? getTxExplorerUrl(POOL_CHAIN.id, txHash) : null;

  // Derive current status
  const isPreparing = currentPhase !== null && currentPhase !== "prepared";
  const isConfirming = txHash !== null && !isConfirmed && !error;

  // ----- Hero copy -----

  const title = isConfirmed
    ? "Withdrawal confirmed"
    : error
      ? "Withdrawal failed"
      : isConfirming
        ? "Processing withdrawal"
        : isPreparing
          ? "Preparing withdrawal"
          : "Processing withdrawal";

  const subtitle = isConfirmed
    ? "Your withdrawal has been completed successfully."
    : error
      ? "Something went wrong. Please check the details below."
      : isConfirming
        ? "Waiting for transaction confirmation."
        : isPreparing
          ? "Generating zero-knowledge proof. This may take 5-10 seconds."
          : "Submitting your withdrawal transaction.";

  // ----- Timeline -----

  const timeline: TimelineItem[] = [
    {
      label: "Preparing withdrawal",
      status:
        error &&
        (error.type === "fees" ||
          error.type === "precondition" ||
          error.type === "context" ||
          error.type === "witness" ||
          error.type === "proof")
          ? "failed"
          : currentPhase === "prepared" || txHash
            ? "completed"
            : isPreparing
              ? "active"
              : "pending",
      description: "Calculating fees and generating privacy proof. This may take 5-10 seconds.",
      errorMessage:
        error &&
        (error.type === "fees" ||
          error.type === "precondition" ||
          error.type === "context" ||
          error.type === "witness" ||
          error.type === "proof")
          ? getUserMessage(new Error(error.message))
          : undefined,
    },
    {
      label: "Submitting transaction",
      status:
        error && error.type === "transaction"
          ? "failed"
          : txHash
            ? "completed"
            : currentPhase === "prepared"
              ? "active"
              : "pending",
      description: "Broadcasting to network.",
      errorMessage:
        error && error.type === "transaction"
          ? getUserMessage(new Error(error.message))
          : undefined,
    },
    {
      label: "Withdrawal confirmed",
      status: isConfirmed ? "completed" : txHash ? "active" : "pending",
      description: "Funds sent to recipient.",
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
    if (isConfirmed) return <CheckCircle className="h-12 w-12 text-green-500" />;
    if (error) return <XCircle className="h-12 w-12 text-red-500" />;
    return <Hourglass className="h-12 w-12 text-gray-300" />;
  };

  return (
    <div className="flex flex-1 flex-col space-y-4 px-6 py-4">
      <div className="flex flex-1 flex-col items-center space-y-4">
        {/* Hero */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <StatusIcon />

          <h2 className="text-2xl font-bold">{title}</h2>

          <span className="text-5xl font-extrabold">{amount.toFixed(4)} ETH</span>

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
        {/* Close Button */}
        <Button
          onClick={onClose}
          className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
          size="lg"
        >
          Close
        </Button>

        {explorerUrl && (
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
    </div>
  );
}
