import type { IntentPhase } from "@shinobi-cash/data";

interface Props {
  phase: IntentPhase;
}

const PHASE_COLORS: Record<IntentPhase, { bg: string; ring: string }> = {
  CREATED: { bg: "bg-yellow-500", ring: "ring-yellow-500/30" },
  ESCROWED: { bg: "bg-blue-500", ring: "ring-blue-500/30" },
  FILLED: { bg: "bg-purple-500", ring: "ring-purple-500/30" },
  FINALIZED: { bg: "bg-emerald-500", ring: "ring-emerald-500/30" },
  REFUNDED: { bg: "bg-red-500", ring: "ring-red-500/30" },
};

export function IntentStatusDot({ phase }: Props) {
  const colors = PHASE_COLORS[phase] || PHASE_COLORS.CREATED;

  return (
    <div className={`h-2 w-2 rounded-full ${colors.bg} ring-2 ${colors.ring}`} />
  );
}
