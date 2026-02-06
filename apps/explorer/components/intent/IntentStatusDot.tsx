import type { IntentPhase } from "@shinobi-cash/data";
import { PHASE_COLORS } from "@/config/phaseColors";

interface Props {
  phase: IntentPhase;
}

export function IntentStatusDot({ phase }: Props) {
  const colors = PHASE_COLORS[phase] || PHASE_COLORS.CREATED;

  return (
    <div className={`h-2 w-2 rounded-full ${colors.dot} ring-2 ${colors.ring}`} />
  );
}
