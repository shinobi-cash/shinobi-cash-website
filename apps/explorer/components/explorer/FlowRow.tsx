import { formatEthAmount, formatHash } from "@/utils/formatters";
import { getAddressLabel } from "@/utils/addressLabels";
import { CopyableText } from "./CopyableText";

interface FlowRowProps {
  label: "From" | "To";
  role: string;
  address: string;
  amount: bigint | null;
  direction: "in" | "out";
  feeType?: string;
  highlight?: boolean;
  note?: string;
}

export function FlowRow({
  label,
  role,
  address,
  amount,
  direction,
  feeType,
  highlight,
  note,
}: FlowRowProps) {
  const addressLabel = getAddressLabel(address);
  const displayName = addressLabel?.name || role;

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        highlight ? "bg-white/10" : "bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">{label}</span>
        <span className={`text-sm font-medium ${highlight ? "text-white" : "text-neutral-200"}`}>
          {displayName}
        </span>
        <CopyableText
          value={address}
          displayValue={`(${formatHash(address)})`}
          className="font-mono text-xs text-neutral-500"
        />
        {feeType && (
          <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
            {feeType}
          </span>
        )}
        {note && <span className="text-xs text-neutral-500">{note}</span>}
      </div>
      {amount !== null && (
        <span
          className={`tabular-nums text-sm font-medium ${
            direction === "in" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {direction === "in" ? "+" : "−"}
          {formatEthAmount(amount, { decimals: 6 })} ETH
        </span>
      )}
    </div>
  );
}
