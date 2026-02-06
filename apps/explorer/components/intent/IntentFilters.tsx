"use client";

import type { IntentTypeFilter, IntentPhaseFilter } from "@/services/data/indexerService";

interface Props {
  intentType: IntentTypeFilter | undefined;
  phase: IntentPhaseFilter | undefined;
  onIntentTypeChange: (type: IntentTypeFilter | undefined) => void;
  onPhaseChange: (phase: IntentPhaseFilter | undefined) => void;
}

const INTENT_TYPES: { value: IntentTypeFilter | undefined; label: string }[] = [
  { value: undefined, label: "All Types" },
  { value: "DEPOSIT", label: "Deposits" },
  { value: "WITHDRAWAL", label: "Withdrawals" },
];

const PHASES: { value: IntentPhaseFilter | undefined; label: string }[] = [
  { value: undefined, label: "All Phases" },
  { value: "CREATED", label: "Created" },
  { value: "ESCROWED", label: "Escrowed" },
  { value: "FILLED", label: "Filled" },
  { value: "FINALIZED", label: "Finalized" },
  { value: "REFUNDED", label: "Refunded" },
];

export function IntentFilters({
  intentType,
  phase,
  onIntentTypeChange,
  onPhaseChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Intent Type Filter */}
      <div className="flex rounded-lg bg-white/5 p-1">
        {INTENT_TYPES.map((type) => (
          <button
            key={type.value ?? "all"}
            onClick={() => onIntentTypeChange(type.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              intentType === type.value
                ? "bg-white/10 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Phase Filter */}
      <div className="flex rounded-lg bg-white/5 p-1">
        {PHASES.map((p) => (
          <button
            key={p.value ?? "all"}
            onClick={() => onPhaseChange(p.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              phase === p.value
                ? "bg-white/10 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
