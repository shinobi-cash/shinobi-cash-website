/**
 * Note Row Component
 *
 * Displays a single note in the notes list.
 * Aligned with explorer design - simple row with status dot.
 */

import type { Note } from "@shinobi-cash/core/discovery";
import { formatTimestamp } from "@/utils/formatters";
import { getStatusDotColor } from "@/utils/noteFiltering";
import { AmountDisplay } from "@/components/shared/AmountDisplay";

interface NoteRowProps {
  note: Note;
  onClick?: () => void;
}

export function NoteRow({ note, onClick }: NoteRowProps) {
  const noteLabel = `Note #${note.depositIndex + 1}`;
  const dotColor = getStatusDotColor(note);

  return (
    <button
      type="button"
      className="w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Status dot + Label + Timestamp */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
            <span className="truncate text-sm font-medium text-white">{noteLabel}</span>
          </div>
          <div className="mt-0.5 pl-[18px] text-xs text-neutral-400">
            {formatTimestamp(note.timestamp)}
          </div>
        </div>

        {/* Right: Amount with USD */}
        <div className="shrink-0 text-right">
          <AmountDisplay
            amount={note.amount}
            layout="stacked"
            ethOptions={{ maxDecimals: 6 }}
            ethClassName="text-sm font-semibold tabular-nums text-white"
            usdClassName="text-xs text-neutral-500"
          />
        </div>
      </div>
    </button>
  );
}
