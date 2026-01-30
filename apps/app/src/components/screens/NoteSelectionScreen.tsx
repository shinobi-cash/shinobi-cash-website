/**
 * Note Selection Screen Component
 * Full-screen view for selecting a note to withdraw from
 */

import type { Note } from "@shinobi-cash/core";
import { formatEthAmount } from "@/utils/formatters";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";

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
    <ScreenLayout containerClassName="h-[600px]" header={<ScreenHeader title="Select Note" onBack={onBack} />} contentClassName="">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : availableNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-12">
          <div className="text-muted-foreground text-center">
            <p className="mb-2 text-lg font-medium">No notes available</p>
            <p className="text-sm">Make a deposit to create a note</p>
          </div>
        </div>
      ) : (
        <div className="divide-border divide-y">
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
                className={`flex w-full cursor-pointer items-center gap-3 px-4 py-4 transition-colors ${
                  isSelected
                    ? "border-l-4 border-orange-600 bg-orange-600/20"
                    : "hover:bg-muted/50 border-l-4 border-transparent"
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
                  <div className="text-foreground text-base font-semibold">
                    Note #{note.depositIndex + 1}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {Number.parseFloat(amount).toFixed(4)} {asset.symbol}
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
