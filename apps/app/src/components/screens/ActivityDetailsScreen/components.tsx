/**
 * Reusable components for Activity Details Screen
 */

import type { Note } from "@shinobi-cash/core/discovery";
import { formatEthAmount } from "@/utils/formatters";

/**
 * Clickable serial number link to view note chain
 */
export function SerialLink({
  serial,
  note,
  onViewNoteChain,
}: {
  serial: string;
  note: Note;
  onViewNoteChain?: (note: Note) => void;
}) {
  if (!onViewNoteChain) {
    return <span className="font-mono text-sm text-white">{serial}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onViewNoteChain(note)}
      className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline"
    >
      {serial}
    </button>
  );
}

/**
 * Formatted ETH amount with color based on type
 */
export function AmountValue({
  amount,
  type,
}: {
  amount: string | bigint;
  type: "positive" | "negative" | "fee";
}) {
  const value = typeof amount === "bigint" ? amount.toString() : amount;
  const colorClass =
    type === "positive"
      ? "text-emerald-400"
      : type === "negative"
        ? "text-rose-400"
        : "text-orange-400";
  const prefix = type === "positive" ? "+" : "−";

  return (
    <span className={colorClass}>
      {prefix}
      {formatEthAmount(value, { maxDecimals: 6 })} ETH
    </span>
  );
}
