import type { Note } from "@shinobi-cash/core";
import { formatTimestamp } from "@/utils/formatters";
import { AmountDisplay } from "@/components/shared/AmountDisplay";

interface NoteRowProps {
  note: Note;
  onClick?: () => void;
}

interface StatusBadge {
  label: string;
  className: string;
}

/**
 * Get status badge based on note state.
 * Uses status fields directly for clean display.
 */
function getStatusBadge(note: Note): StatusBadge | null {
  // Spent notes
  if (note.status === "spent") {
    return { label: "Spent", className: "bg-neutral-400/10 text-neutral-400" };
  }

  // Cross-chain intent pending (waiting for solver)
  if (note.isCrossChain && note.intentStatus === "pending") {
    return { label: "Pending", className: "bg-yellow-400/10 text-yellow-400" };
  }

  // Cross-chain intent refunded
  if (note.isCrossChain && note.intentStatus === "refunded") {
    return { label: "Refunded", className: "bg-orange-400/10 text-orange-400" };
  }

  // ASP pending approval
  if (note.aspStatus === "pending") {
    return { label: "Pending", className: "bg-blue-400/10 text-blue-400" };
  }

  // ASP rejected
  if (note.aspStatus === "rejected") {
    return { label: "Rejected", className: "bg-red-400/10 text-red-400" };
  }

  // Approved and ready - no badge
  return null;
}

export function NoteRow({ note, onClick }: NoteRowProps) {
  const noteLabel = `Note #${note.depositIndex + 1}`;
  const statusBadge = getStatusBadge(note);

  return (
    <button
      type="button"
      className="border-white/10 bg-white/[0.02] hover:bg-white/[0.04] w-full cursor-pointer rounded-lg border border-b px-2 py-2 text-left transition-all duration-150 sm:px-3 sm:py-3"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          {/* Left side: Type and amount */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="text-white truncate text-base font-semibold capitalize tracking-tight sm:text-lg">
                {noteLabel}
              </div>
              {statusBadge && (
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>
            <div className="text-neutral-400 text-xs font-medium tabular-nums sm:text-base">
              <AmountDisplay
                amount={note.amount}
                layout="inline"
                ethOptions={{ maxDecimals: 6 }}
                className="gap-1.5"
                ethClassName="text-neutral-400"
                usdClassName="text-neutral-500 text-xs"
              />
            </div>
          </div>

          {/* Right side: Status and timestamp */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right">
              <div className="text-neutral-500 whitespace-nowrap text-xs font-medium sm:text-sm">
                {formatTimestamp(note.timestamp)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
