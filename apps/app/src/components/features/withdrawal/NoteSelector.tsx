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
      <button
        onClick={() => setIsNoteDropdownOpen(!isNoteDropdownOpen)}
        disabled={isLoadingNotes || availableNotes.length === 0}
        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50"
        aria-labelledby="from-label"
        aria-haspopup="menu"
        aria-expanded={isNoteDropdownOpen}
        aria-controls={isNoteDropdownOpen ? "note-dropdown" : undefined}
      >
        {isLoadingNotes ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span className="text-sm font-semibold text-white">Loading...</span>
          </>
        ) : availableNotes.length === 0 ? (
          <span className="text-sm font-semibold text-white">No notes</span>
        ) : selectedNote ? (
          <>
            <span className="text-sm font-semibold text-white">{getNoteLabel(selectedNote)}</span>
            <ChevronDown className="w-4 h-4 text-white/70" />
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-white">Select note</span>
            <ChevronDown className="w-4 h-4 text-white/70" />
          </>
        )}
      </button>

      {isNoteDropdownOpen && availableNotes.length > 1 && (
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
