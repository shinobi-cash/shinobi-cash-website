import type { Note } from "@/lib/storage/types";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";

interface NoteSelectorProps {
  availableNotes: Note[];
  selectedNote: Note | null;
  setSelectedNote: (note: Note) => void;
  isLoadingNotes: boolean;
  preSelectedNote?: Note | null;
  asset: { symbol: string };
}

// Helper function for note labels
const getNoteLabel = (note: Note) => {
  return note.changeIndex === 0 ? `Deposit #${note.depositIndex}` : `Change #${note.depositIndex}.${note.changeIndex}`;
};

export const NoteSelector = ({
  availableNotes,
  selectedNote,
  setSelectedNote,
  isLoadingNotes,
  preSelectedNote,
  asset,
}: NoteSelectorProps) => {
  const [isNoteDropdownOpen, setIsNoteDropdownOpen] = useState(false);

  return (
    <div className="relative">
      <input
        id="from-note"
        readOnly
        value={
          selectedNote
            ? `${getNoteLabel(selectedNote)} — ${formatEthAmount(selectedNote.amount, {
                maxDecimals: 6,
              })} ${asset.symbol}`
            : ""
        }
        className="sr-only"
      />
      <Button
        variant="outline"
        onClick={() => !preSelectedNote && setIsNoteDropdownOpen(!isNoteDropdownOpen)}
        className={`w-full h-16 p-4 justify-between text-left rounded-xl has-[>svg]:px-4 ${
          preSelectedNote ? "cursor-default" : ""
        }`}
        aria-labelledby="from-label"
        aria-haspopup={preSelectedNote ? undefined : "menu"}
        aria-expanded={preSelectedNote ? undefined : isNoteDropdownOpen}
        aria-controls={!preSelectedNote && isNoteDropdownOpen ? "note-dropdown" : undefined}
      >
        {isLoadingNotes ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-app-secondary" />
            <span className="text-app-secondary">Loading notes...</span>
          </div>
        ) : availableNotes.length === 0 ? (
          <span className="text-app-secondary">No notes available</span>
        ) : selectedNote ? (
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-app-primary text-sm">{getNoteLabel(selectedNote)}</div>
            <div className="text-xs text-app-secondary">
              {formatEthAmount(selectedNote.amount, { maxDecimals: 6 })} {asset.symbol}
            </div>
          </div>
        ) : (
          <span className="text-app-secondary">Choose a note...</span>
        )}
        {!isLoadingNotes &&
          availableNotes.length > 0 &&
          !preSelectedNote &&
          (isNoteDropdownOpen ? (
            <ChevronUp className="w-4 h-4 text-app-secondary ml-2" />
          ) : (
            <ChevronDown className="w-4 h-4 text-app-secondary ml-2" />
          ))}
      </Button>

      {!preSelectedNote && isNoteDropdownOpen && availableNotes.length > 1 && (
        <div
          id="note-dropdown"
          role="menu"
          tabIndex={-1}
          className="absolute top-full left-0 right-0 z-10 mt-1 bg-app-surface border border-app rounded-xl shadow-lg overflow-hidden"
        >
          <div className="max-h-60 overflow-y-auto">
            {availableNotes.map((note) => (
              <button
                key={`${note.depositIndex}-${note.changeIndex}`}
                type="button"
                onClick={() => {
                  setSelectedNote(note);
                  setIsNoteDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-app-surface-hover transition-colors border-b border-app-border last:border-b-0"
                role="menuitem"
                aria-selected={
                  selectedNote?.depositIndex === note.depositIndex && selectedNote?.changeIndex === note.changeIndex
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-app-primary text-sm truncate">{getNoteLabel(note)}</div>
                    <div className="text-xs text-app-secondary font-medium">
                      {formatEthAmount(note.amount, { maxDecimals: 6 })} {asset.symbol}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-app-tertiary whitespace-nowrap">{formatTimestamp(note.timestamp)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
