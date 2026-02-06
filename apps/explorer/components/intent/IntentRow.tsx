import type { Intent } from "@shinobi-cash/data";
import { formatTimestamp, formatHash } from "@/utils/formatters";
import { getChainName } from "@/config/chains";
import { IntentStatusDot } from "./IntentStatusDot";
import { PHASE_COLORS, PHASE_LABELS } from "./phaseColors";

interface Props {
  intent: Intent;
}

export function IntentRow({ intent }: Props) {
  const isDeposit = intent.intentType === "DEPOSIT";
  const phaseLabel = PHASE_LABELS[intent.phase] ?? intent.phase.toLowerCase();
  const phaseColors = PHASE_COLORS[intent.phase] ?? PHASE_COLORS.CREATED;

  const originChain = intent.originChainId ? getChainName(Number(intent.originChainId)) : "Unknown";
  const destChain = intent.destinationChainId ? getChainName(Number(intent.destinationChainId)) : "Pool";

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IntentStatusDot phase={intent.phase} />
          <span className="text-sm font-medium text-white">
            {isDeposit ? "Deposit" : "Withdraw"}
          </span>
          <span className="text-neutral-600">|</span>
          <span className="font-mono text-xs text-neutral-400">
            {formatHash(intent.orderId)}
          </span>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${phaseColors.badge}`}>
          {phaseLabel}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-neutral-500">
          {originChain} → {destChain}
        </span>
        <span className="text-neutral-400">
          {formatTimestamp(intent.timestamp)}
        </span>
      </div>
    </div>
  );
}
