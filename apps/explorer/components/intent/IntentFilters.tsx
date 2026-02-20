"use client";

import { ChevronDown } from "lucide-react";
import type { IntentTypeFilter, IntentPhaseFilter } from "@/services/data/indexerService";
import { SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@workspace/ui/components/dropdown-menu";

interface Props {
  intentType: IntentTypeFilter | undefined;
  phase: IntentPhaseFilter | undefined;
  originChainId: string | undefined;
  destinationChainId: string | undefined;
  onIntentTypeChange: (type: IntentTypeFilter | undefined) => void;
  onPhaseChange: (phase: IntentPhaseFilter | undefined) => void;
  onOriginChainIdChange: (chainId: string | undefined) => void;
  onDestinationChainIdChange: (chainId: string | undefined) => void;
}

const INTENT_TYPES: { value: IntentTypeFilter | undefined; label: string }[] = [
  { value: undefined, label: "Any" },
  { value: "DEPOSIT", label: "Deposits" },
  { value: "WITHDRAWAL", label: "Withdrawals" },
];

const PHASES: { value: IntentPhaseFilter | undefined; label: string }[] = [
  { value: undefined, label: "Any" },
  { value: "CREATED", label: "Created" },
  { value: "ESCROWED", label: "Escrowed" },
  { value: "FILLED", label: "Filled" },
  { value: "FINALIZED", label: "Finalized" },
  { value: "REFUNDED", label: "Refunded" },
];

const CHAINS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: "Any" },
  ...SHINOBI_CASH_SUPPORTED_CHAINS.map((chain) => ({
    value: chain.id.toString(),
    label: chain.name,
  })),
];

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string | undefined; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  const selectedOption = options.find((o) => o.value === value);
  const isActive = value !== undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${
            isActive
              ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
              : "border-white/10 bg-white/5 text-neutral-400 hover:text-white"
          }`}
        >
          <span className="text-neutral-500">{label}:</span>
          <span>{selectedOption?.label ?? options[0]?.label}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-32 border-white/10 bg-neutral-900">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value ?? "all"}
            onClick={() => onChange(option.value)}
            className={`text-sm ${
              value === option.value
                ? "bg-white/10 text-white"
                : "text-neutral-300 focus:bg-white/10 focus:text-white"
            }`}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function IntentFilters({
  intentType,
  phase,
  originChainId,
  destinationChainId,
  onIntentTypeChange,
  onPhaseChange,
  onOriginChainIdChange,
  onDestinationChainIdChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type Filter */}
      <FilterDropdown
        label="Type"
        value={intentType}
        options={INTENT_TYPES}
        onChange={(v) => onIntentTypeChange(v as IntentTypeFilter | undefined)}
      />

      {/* Phase Filter */}
      <FilterDropdown
        label="Phase"
        value={phase}
        options={PHASES}
        onChange={(v) => onPhaseChange(v as IntentPhaseFilter | undefined)}
      />

      {/* Origin Chain Filter */}
      <FilterDropdown
        label="Origin"
        value={originChainId}
        options={CHAINS}
        onChange={onOriginChainIdChange}
      />

      {/* Destination Chain Filter */}
      <FilterDropdown
        label="Destination"
        value={destinationChainId}
        options={CHAINS}
        onChange={onDestinationChainIdChange}
      />
    </div>
  );
}
