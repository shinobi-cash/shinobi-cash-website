"use client";

import { CheckCircle, Clock, Hourglass, XCircle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export type StepStatus = "completed" | "active" | "pending" | "failed";

export interface TimelineItem {
  label: string;
  status: StepStatus;
  description: string;
  errorMessage?: string;
  link?: { url: string; text: string };
  timestamp?: string;
  duration?: string;
}

export interface StepTiming {
  startTime: Date;
  displayTime: string;
  duration?: string;
}

export function formatDuration(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function StepIcon({ status }: { status: StepStatus }) {
  if (status === "completed") return <CheckCircle className="h-6 w-6 text-emerald-400" />;
  if (status === "active") return <Clock className="h-6 w-6 animate-pulse text-yellow-400" />;
  if (status === "failed") return <XCircle className="h-6 w-6 text-rose-400" />;
  return <div className="h-6 w-6 rounded-full border-2 border-white/10" />;
}

export function StatusIcon({ isComplete, hasError }: { isComplete: boolean; hasError: boolean }) {
  if (isComplete) return <CheckCircle className="h-12 w-12 text-emerald-400" />;
  if (hasError) return <XCircle className="h-12 w-12 text-rose-400" />;
  return <Hourglass className="h-12 w-12 animate-pulse text-neutral-400" />;
}

interface TimelineStepsProps {
  items: TimelineItem[];
}

export function TimelineSteps({ items }: TimelineStepsProps) {
  return (
    <div className="w-full max-w-md">
      <div className="relative space-y-6">
        {items.map((step, idx) => (
          <div key={idx} className="relative flex gap-4">
            {idx !== items.length - 1 && (
              <div
                className={cn(
                  "absolute left-[11px] top-6 h-full w-[2px]",
                  step.status === "completed"
                    ? "bg-emerald-400/20"
                    : step.status === "failed"
                      ? "bg-rose-400/20"
                      : "bg-white/10"
                )}
              />
            )}

            <div className="relative z-10">
              <StepIcon status={step.status} />
            </div>

            <div className="flex flex-col gap-1">
              {step.timestamp && (
                <span className="text-xs text-neutral-500">
                  {step.timestamp}
                  {step.duration && ` · ${step.duration}`}
                </span>
              )}
              <h3
                className={cn(
                  "font-semibold",
                  step.status === "failed"
                    ? "text-rose-400"
                    : step.status === "pending"
                      ? "text-neutral-500"
                      : "text-neutral-200"
                )}
              >
                {step.label}
              </h3>
              {step.errorMessage ? (
                <p className="text-sm text-rose-400">{step.errorMessage}</p>
              ) : (
                <p
                  className={cn(
                    "text-sm",
                    step.status === "pending" ? "text-neutral-600" : "text-neutral-400"
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
                        className="font-medium text-white hover:underline"
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
  );
}
