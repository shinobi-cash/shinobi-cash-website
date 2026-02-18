import type { IntentPhase } from "@shinobi-cash/data";
import type { IntentTimelineEvent } from "@/controllers/IntentExplorerController";
import { formatTimestamp, formatHash } from "@/utils/formatters";
import { getChainName, getTxExplorerUrl } from "@/config/chains";
import { Check, Clock, AlertCircle } from "lucide-react";

interface Props {
  events: IntentTimelineEvent[];
  currentPhase: IntentPhase;
}

// CREATED and ESCROWED happen in same tx, so we only show ESCROWED
const PHASE_ORDER: IntentPhase[] = ["ESCROWED", "FILLED", "FINALIZED"];
const REFUND_PHASE: IntentPhase = "REFUNDED";

function PhaseIcon({ phase, isActive, isCompleted }: { phase: IntentPhase; isActive: boolean; isCompleted: boolean }) {
  if (phase === REFUND_PHASE) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400">
        <AlertCircle className="h-4 w-4" />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <Check className="h-4 w-4" />
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
        <Clock className="h-4 w-4 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-neutral-500">
      <div className="h-2 w-2 rounded-full bg-current" />
    </div>
  );
}

function getPhaseDescription(phase: IntentPhase, event?: IntentTimelineEvent): string {
  if (phase === "FILLED" && event?.solver) {
    return `Solver (${formatHash(event.solver)}) filled the intent`;
  }

  const descriptions: Record<IntentPhase, string> = {
    ESCROWED: "Intent created and funds escrowed",
    FILLED: "Solver filled the intent",
    FINALIZED: "Intent finalized and settled",
    REFUNDED: "Intent refunded to user",
  };
  return descriptions[phase];
}

export function IntentTimeline({ events, currentPhase }: Props) {
  const eventMap = new Map(events.map((e) => [e.phase, e]));
  const isRefunded = currentPhase === REFUND_PHASE;
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  const displayPhases = isRefunded
    ? [...PHASE_ORDER.slice(0, Math.max(1, currentIndex)), REFUND_PHASE]
    : PHASE_ORDER;

  return (
    <div className="relative space-y-6">
      {displayPhases.map((phase, index) => {
        const event = eventMap.get(phase);
        // A phase is completed if we have event data for it (it has happened)
        const hasEvent = !!event;
        // Phases up to and including current phase are completed (if they have events)
        const isCompleted = isRefunded
          ? phase !== REFUND_PHASE && hasEvent
          : hasEvent;
        // A phase is "pending" if it's after the current phase and has no event
        const isPending = !hasEvent && PHASE_ORDER.indexOf(phase) > currentIndex;
        const isLast = index === displayPhases.length - 1;

        return (
          <div key={phase} className="relative flex gap-4">
            {/* Vertical line - extends through the space-y-6 gap to top of next circle */}
            {!isLast && (
              <div
                className={`absolute left-4 top-8 h-[calc(100%-0.5rem)] w-px -translate-x-1/2 ${
                  isCompleted ? "bg-emerald-500/50" : "bg-white/10"
                }`}
              />
            )}

            {/* Icon */}
            <div className="relative z-10">
              <PhaseIcon phase={phase} isActive={false} isCompleted={isCompleted} />
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium capitalize ${
                    isCompleted ? "text-white" : "text-neutral-500"
                  }`}
                >
                  {phase.toLowerCase()}
                </span>
                {isPending && (
                  <span className="text-xs text-neutral-500">(pending)</span>
                )}
              </div>

              <p className="mt-0.5 text-xs text-neutral-500">
                {getPhaseDescription(phase, event)}
              </p>

              {event && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <a
                    href={getTxExplorerUrl(Number(event.chainId), event.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-neutral-300 transition-colors hover:text-orange-400"
                  >
                    {getChainName(Number(event.chainId))}
                    <span className="text-neutral-500">↗</span>
                  </a>
                  <span className="text-neutral-400">{formatTimestamp(event.timestamp)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
