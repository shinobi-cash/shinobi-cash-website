import type { Note } from "@/lib/storage/types";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";

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
      className="w-full text-left bg-app-surface border-b border-app px-2 py-2 sm:px-3 sm:py-3 active:bg-app-surface-hover transition-all duration-150 cursor-pointer hover:bg-app-surface-hover"
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-app-primary tracking-tight capitalize text-base sm:text-lg truncate">
                {noteLabel}
              </div>
              {!note.isActivated && (
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                  Pending
                </span>
              )}
            </div>
            <div className="text-xs sm:text-base text-app-secondary font-medium tabular-nums">
              Balance: {formatEthAmount(note.amount)} ETH
            </div>
          </div>

          {/* Right side: Status and timestamp */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right">
              <div className="text-xs sm:text-sm text-app-tertiary font-medium whitespace-nowrap">
                {formatTimestamp(note.timestamp)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
