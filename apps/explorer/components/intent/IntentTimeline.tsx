import type { IntentTimelineEvent, IntentPhase } from "@shinobi-cash/data";
import { formatTimestamp, formatHash } from "@/utils/formatters";
import { getChainName, getTxExplorerUrl } from "@/config/chains";
import { ExternalLink, Check, Clock, AlertCircle } from "lucide-react";

interface Props {
  events: IntentTimelineEvent[];
  currentPhase: IntentPhase;
}

const PHASE_ORDER: IntentPhase[] = ["CREATED", "ESCROWED", "FILLED", "FINALIZED"];
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

const PHASE_DESCRIPTIONS: Record<IntentPhase, string> = {
  CREATED: "Intent created on origin chain",
  ESCROWED: "Funds escrowed by settler",
  FILLED: "Solver filled the intent",
  FINALIZED: "Intent finalized and settled",
  REFUNDED: "Intent refunded to user",
};

export function IntentTimeline({ events, currentPhase }: Props) {
  const eventMap = new Map(events.map((e) => [e.phase, e]));
  const isRefunded = currentPhase === REFUND_PHASE;
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  const displayPhases = isRefunded
    ? [...PHASE_ORDER.slice(0, Math.max(1, currentIndex)), REFUND_PHASE]
    : PHASE_ORDER;

  return (
    <div className="space-y-0">
      {displayPhases.map((phase, index) => {
        const event = eventMap.get(phase);
        const isCompleted = isRefunded
          ? phase !== REFUND_PHASE && PHASE_ORDER.indexOf(phase) < currentIndex
          : PHASE_ORDER.indexOf(phase) < currentIndex;
        const isActive = phase === currentPhase;
        const isLast = index === displayPhases.length - 1;

        return (
          <div key={phase} className="relative flex gap-4">
            {/* Vertical line */}
            {!isLast && (
              <div
                className={`absolute left-4 top-8 h-full w-px -translate-x-1/2 ${
                  isCompleted ? "bg-emerald-500/50" : "bg-white/10"
                }`}
              />
            )}

            {/* Icon */}
            <div className="relative z-10">
              <PhaseIcon phase={phase} isActive={isActive} isCompleted={isCompleted} />
            </div>

            {/* Content */}
            <div className={`flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium capitalize ${
                    isActive || isCompleted ? "text-white" : "text-neutral-500"
                  }`}
                >
                  {phase.toLowerCase()}
                </span>
                {isActive && !isRefunded && phase !== "FINALIZED" && (
                  <span className="text-xs text-blue-400">(in progress)</span>
                )}
              </div>

              <p className="mt-0.5 text-xs text-neutral-500">
                {PHASE_DESCRIPTIONS[phase]}
              </p>

              {event && (
                <div className="mt-2 space-y-1 rounded-lg bg-white/5 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Time</span>
                    <span className="text-neutral-300">{formatTimestamp(event.timestamp)}</span>
                  </div>

                  {event.originChainId && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Chain</span>
                      <span className="text-neutral-300">
                        {getChainName(Number(event.originChainId))}
                      </span>
                    </div>
                  )}

                  {event.solver && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Solver</span>
                      <span className="font-mono text-neutral-300">
                        {formatHash(event.solver)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Tx</span>
                    <a
                      href={getTxExplorerUrl(event.originChainId ?? 421614, event.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300"
                    >
                      {formatHash(event.txHash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
