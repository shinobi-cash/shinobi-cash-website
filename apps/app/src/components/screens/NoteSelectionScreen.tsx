/**
 * Note Selection Screen Component
 * Full-screen view for selecting a note to withdraw from
 */

import type { Note } from "@shinobi-cash/core";
import { formatTimestamp } from "@/utils/formatters";
import { getStatusDotColor } from "@/utils/noteFiltering";
import { Loader2, Check } from "lucide-react";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { AmountDisplay } from "@/components/shared/AmountDisplay";

interface NoteSelectionScreenProps {
  availableNotes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function NoteSelectionScreen({
  availableNotes,
  selectedNote,
  onSelectNote,
  onBack,
  isLoading,
}: NoteSelectionScreenProps) {
  return (
    <ScreenLayout
      containerClassName="h-[600px]"
      header={<ScreenHeader title="Select Note" onBack={onBack} />}
      contentClassName=""
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : availableNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-12">
          <div className="text-center">
            <p className="mb-2 text-lg font-medium text-neutral-400">No notes available</p>
            <p className="text-sm text-neutral-500">Make a deposit to create a note</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {availableNotes.map((note) => {
            const isSelected = selectedNote?.label === note.label;
            const noteId = `${note.depositIndex}-${note.changeIndex}`;
            const dotColor = getStatusDotColor(note);

            return (
              <button
                key={noteId}
                type="button"
                onClick={() => {
                  onSelectNote(note);
                  onBack();
                }}
                className={`w-full cursor-pointer px-4 py-3 text-left transition-colors ${
                  isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Status dot + Label + Timestamp */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
                      />
                      <span className="truncate text-sm font-medium text-white">
                        Note #{note.depositIndex + 1}
                      </span>
                    </div>
                    <div className="mt-0.5 pl-[18px] text-xs text-neutral-400">
                      {formatTimestamp(note.timestamp)}
                    </div>
                  </div>

                  {/* Right: Amount with USD + Check if selected */}
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 text-right">
                      <AmountDisplay
                        amount={note.amount}
                        layout="stacked"
                        ethOptions={{ maxDecimals: 6 }}
                        ethClassName="text-sm font-semibold tabular-nums text-white"
                        usdClassName="text-xs text-neutral-500"
                      />
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </ScreenLayout>
  );
}
