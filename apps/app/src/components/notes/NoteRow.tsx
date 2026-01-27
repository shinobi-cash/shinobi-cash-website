import type { Note } from "@shinobi-cash/core";
import { formatTimestamp } from "@/utils/formatters";
import { getPendingReason, type PendingReason } from "@/utils/noteFiltering";
import { AmountDisplay } from "@/components/shared/AmountDisplay";

interface NoteRowProps {
  note: Note;
  onClick?: () => void;
}

interface BadgeStyle {
  bg: string;
  text: string;
  label: string;
}

function getPendingBadgeStyle(reason: PendingReason): BadgeStyle {
  switch (reason) {
    case "waitingForSolver":
      return {
        bg: "bg-yellow-400/10",
        text: "text-yellow-400",
        label: "Awaiting Solver",
      };
    case "awaitingApproval":
      return {
        bg: "bg-blue-400/10",
        text: "text-blue-400",
        label: "Awaiting Approval",
      };
    case "rejected":
      return {
        bg: "bg-orange-400/10",
        text: "text-orange-400",
        label: "Rejected",
      };
  }
}

export function NoteRow({ note, onClick }: NoteRowProps) {
  // Show user-friendly labels based on chain progression
  const noteLabel = `Note ${note.depositIndex + 1}.${note.changeIndex}`;
  const pendingReason = getPendingReason(note);
  const badgeStyle = pendingReason ? getPendingBadgeStyle(pendingReason) : null;

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
              {badgeStyle && (
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle.bg} ${badgeStyle.text}`}>
                  {badgeStyle.label}
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
