/**
 * Note Selection Screen Component
 * Full-screen view for selecting a note to withdraw from
 */

import { BackButton } from "../../ui/back-button";
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
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <BackButton onClick={onBack} />
        <h2 className="text-lg font-semibold text-white">Select Note</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : availableNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-gray-400 text-center">
              <p className="text-lg font-medium mb-2">No notes available</p>
              <p className="text-sm">Make a deposit to create a note</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {availableNotes.map((note, index) => {
              const isSelected = selectedNote?.commitment === note.commitment;
              const amount = formatEthAmount(note.amount);

              return (
                <button
                  key={note.commitment || `note-${index}`}
                  onClick={() => {
                    onSelectNote(note);
                    onBack();
                  }}
                  className={`w-full px-4 py-4 flex items-center gap-3 transition-colors ${
                    isSelected
                      ? "bg-orange-600/20 border-l-4 border-orange-600"
                      : "hover:bg-gray-800/50 border-l-4 border-transparent"
                  }`}
                >
                  {/* Asset Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <Image
                        src={asset.icon}
                        alt={asset.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                    </div>
                  </div>

                  {/* Note Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-semibold text-white">
                        {Number.parseFloat(amount).toFixed(4)} {asset.symbol}
                      </span>
                      {note.isActivated && (
                        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {note.commitment ? `${note.commitment.slice(0, 10)}...${note.commitment.slice(-8)}` : 'No commitment'}
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
