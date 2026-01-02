import type { Note } from "@shinobi-cash/core";
import { formatTimestamp } from "@/utils/formatters";
import { AmountDisplay } from "@/components/shared/AmountDisplay";

interface NoteRowProps {
  note: Note;
  onClick?: () => void;
}

export function NoteRow({ note, onClick }: NoteRowProps) {
  // Show user-friendly labels based on chain progression
  const noteLabel = `Note ${note.depositIndex + 1}.${note.changeIndex}`;

  return (
    <button
      type="button"
      className="w-full cursor-pointer rounded-lg border border-b border-gray-700 bg-gray-800/50 px-2 py-2 text-left transition-all duration-150 sm:px-3 sm:py-3"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          {/* Left side: Type and amount */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="text-app-primary truncate text-base font-semibold capitalize tracking-tight sm:text-lg">
                {noteLabel}
              </div>
              {!note.isActivated && (
                <span className="whitespace-nowrap rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  Pending
                </span>
              )}
            </div>
            <div className="text-app-secondary text-xs font-medium tabular-nums sm:text-base">
              <AmountDisplay
                amount={note.amount}
                layout="inline"
                ethOptions={{ maxDecimals: 6 }}
                className="gap-1.5"
                ethClassName="text-app-secondary"
                usdClassName="text-app-tertiary text-xs"
              />
            </div>
          </div>

          {/* Right side: Status and timestamp */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right">
              <div className="text-app-tertiary whitespace-nowrap text-xs font-medium sm:text-sm">
                {formatTimestamp(note.timestamp)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
