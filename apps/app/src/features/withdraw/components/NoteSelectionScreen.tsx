/**
 * Note Selection Screen Component
 * Full-screen view for selecting a note to withdraw from
 */

import { BackButton } from "@/components/ui/back-button";
import type { Note } from "@/lib/storage/types";
import { formatEthAmount } from "@/utils/formatters";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface NoteSelectionScreenProps {
  availableNotes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onBack: () => void;
  isLoading: boolean;
  asset: {
    symbol: string;
    name: string;
    icon: string;
  };
}

export function NoteSelectionScreen({
  availableNotes,
  selectedNote,
  onSelectNote,
  onBack,
  isLoading,
  asset,
}: NoteSelectionScreenProps) {
  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-4">
        <BackButton onClick={onBack} />
        <h2 className="text-lg font-semibold text-white">Select Note</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : availableNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12">
            <div className="text-center text-gray-400">
              <p className="mb-2 text-lg font-medium">No notes available</p>
              <p className="text-sm">Make a deposit to create a note</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {availableNotes.map((note) => {
              const isSelected = selectedNote?.label === note.label;
              const amount = formatEthAmount(note.amount);
              const noteId = `${note.depositIndex}-${note.changeIndex}`;

              return (
                <button
                  key={noteId}
                  onClick={() => {
                    onSelectNote(note);
                    onBack();
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-4 transition-colors ${
                    isSelected
                      ? "border-l-4 border-orange-600 bg-orange-600/20"
                      : "border-l-4 border-transparent hover:bg-gray-800/50"
                  }`}
                >
                  {/* Asset Icon */}
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                      <Image
                        src={asset.icon}
                        alt={asset.symbol}
                        width={24}
                        height={24}
                        className="h-6 w-6"
                      />
                    </div>
                  </div>

                  {/* Note Info */}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-base font-semibold text-white">
                        {Number.parseFloat(amount).toFixed(4)} {asset.symbol}
                      </span>
                      {note.isActivated && (
                        <span className="rounded bg-green-400/10 px-2 py-1 text-xs text-green-400">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-gray-400">
                      Note #{note.depositIndex}.{note.changeIndex}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
