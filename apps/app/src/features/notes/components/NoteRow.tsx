import type { Note } from "@/lib/storage/types";
import { formatTimestamp } from "@/utils/formatters";
import { AmountDisplay } from "@/components/shared/AmountDisplay";

interface NoteRowProps {
  note: Note;
  chainLength?: number;
  onClick?: () => void;
}

export function NoteRow({ note, chainLength, onClick }: NoteRowProps) {
  // Show user-friendly labels based on chain progression
  const noteLabel =
    chainLength === 1
      ? "Private Deposit" // Simple case: only one note in chain
      : note.changeIndex === 0
        ? "Initial Deposit"
        : "Updated Balance";

  return (
    <button
      type="button"
      className="bg-app-surface border-app active:bg-app-surface-hover hover:bg-app-surface-hover w-full cursor-pointer border-b px-2 py-2 text-left transition-all duration-150 sm:px-3 sm:py-3"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        // Blur any focused element prior to opening the drawer
        const active = document.activeElement as HTMLElement | null;
        if (active && typeof active.blur === "function") active.blur();
        onClick?.();
      }}
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
