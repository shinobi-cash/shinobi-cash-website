import type { Intent } from "@shinobi-cash/data";
import { formatEthAmount, formatTimestamp, formatHash } from "@/utils/formatters";
import { getChainName } from "@/config/chains";
import { IntentStatusDot } from "./IntentStatusDot";

interface Props {
  intent: Intent;
}

const PHASE_LABELS: Record<string, string> = {
  CREATED: "created",
  ESCROWED: "escrowed",
  FILLED: "filled",
  FINALIZED: "finalized",
  REFUNDED: "refunded",
};

export function IntentRow({ intent }: Props) {
  const isDeposit = intent.intentType === "DEPOSIT";
  const phaseLabel = PHASE_LABELS[intent.phase] ?? intent.phase.toLowerCase();

  const originChain = intent.originChainId ? getChainName(Number(intent.originChainId)) : "Unknown";
  const destChain = intent.destinationChainId ? getChainName(Number(intent.destinationChainId)) : "Pool";

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      {/* Left */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <IntentStatusDot phase={intent.phase} />
          <span className="truncate text-sm font-medium capitalize text-white">
            {isDeposit ? "Deposit" : "Withdrawal"} Intent
          </span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
            {phaseLabel}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
          <span>{formatTimestamp(intent.timestamp)}</span>
          <span className="text-neutral-600">|</span>
          <span className="font-mono">{formatHash(intent.orderId)}</span>
        </div>

        <div className="mt-1 text-xs text-neutral-500">
          {originChain} → {destChain}
        </div>
      </div>

      {/* Right */}
      <div className="shrink-0 text-right">
        {intent.amount && (
          <div
            className={`text-sm font-semibold tabular-nums ${
              isDeposit ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isDeposit ? "+" : "−"}
            {formatEthAmount(intent.amount, { decimals: 6 })} ETH
          </div>
        )}
        {intent.solver && (
          <div className="mt-0.5 text-[10px] text-neutral-500">
            Solver: {formatHash(intent.solver)}
          </div>
        )}
      </div>
    </div>
  );
}
