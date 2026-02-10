import type { IntentPhase } from "@shinobi-cash/data";

export const PHASE_COLORS: Record<IntentPhase, {
  dot: string;
  ring: string;
  badge: string;
  text: string;
}> = {
  ESCROWED: {
    dot: "bg-yellow-500",
    ring: "ring-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-400",
    text: "text-yellow-400",
  },
  FILLED: {
    dot: "bg-blue-500",
    ring: "ring-blue-500/30",
    badge: "bg-blue-500/20 text-blue-400",
    text: "text-blue-400",
  },
  FINALIZED: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-400",
    text: "text-emerald-400",
  },
  REFUNDED: {
    dot: "bg-red-500",
    ring: "ring-red-500/30",
    badge: "bg-red-500/20 text-red-400",
    text: "text-red-400",
  },
};

export const PHASE_LABELS: Record<IntentPhase, string> = {
  ESCROWED: "escrowed",
  FILLED: "filled",
  FINALIZED: "finalized",
  REFUNDED: "refunded",
};
