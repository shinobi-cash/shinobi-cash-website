/**
 * Note Selection Screen Component
 * Full-screen view for selecting notes to withdraw from
 * Supports single note (standard) or two notes (Withdraw2 merge)
 */

import type { Note } from "@shinobi-cash/core/discovery";
import { formatTimestamp } from "@/utils/formatters";
import { getStatusDotColor } from "@/utils/noteFiltering";
import { Loader2, Check, Square, CheckSquare } from "lucide-react";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Button } from "@workspace/ui/components/button";
import { NoteAvatarStack } from "@/components/shared/NoteAvatarGroup";

interface NoteSelectionScreenProps {
  availableNotes: readonly Note[];
  /** Currently selected notes (supports 1-2 for Withdraw2) */
  selectedNotes: readonly Note[];
  /** Toggle a note's selection state */
  onToggleNote: (note: Note) => void;
  /** Clear all selections */
  onClearSelection?: () => void;
  onBack: () => void;
  isLoading: boolean;
  /** Maximum notes that can be selected (default: 2) */
  maxNotes?: number;
}

/** Legacy single-note props for backward compatibility */
interface LegacyNoteSelectionScreenProps {
  availableNotes: readonly Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onBack: () => void;
  isLoading: boolean;
}

type Props = NoteSelectionScreenProps | LegacyNoteSelectionScreenProps;

function isLegacyProps(props: Props): props is LegacyNoteSelectionScreenProps {
  return "selectedNote" in props;
}

export function NoteSelectionScreen(props: Props) {
  // Handle legacy single-note API
  if (isLegacyProps(props)) {
    const { availableNotes, selectedNote, onSelectNote, onBack, isLoading } = props;
    return (
      <NoteSelectionScreenImpl
        availableNotes={availableNotes}
        selectedNotes={selectedNote ? [selectedNote] : []}
        onToggleNote={(note) => {
          onSelectNote(note);
          onBack();
        }}
        onBack={onBack}
        isLoading={isLoading}
        maxNotes={1}
        autoCloseOnSelect
      />
    );
  }

  return <NoteSelectionScreenImpl {...props} />;
}

function NoteSelectionScreenImpl({
  availableNotes,
  selectedNotes,
  onToggleNote,
  onClearSelection,
  onBack,
  isLoading,
  maxNotes = 2,
  autoCloseOnSelect = false,
}: NoteSelectionScreenProps & { autoCloseOnSelect?: boolean }) {
  const isNoteSelected = (note: Note) =>
    selectedNotes.some(
      (n) => n.depositIndex === note.depositIndex && n.changeIndex === note.changeIndex
    );

  const canSelectMore = selectedNotes.length < maxNotes;
  const isMultiSelectMode = maxNotes > 1;

  const handleToggle = (note: Note) => {
    const alreadySelected = isNoteSelected(note);

    // If already selected, always allow deselection
    if (alreadySelected) {
      onToggleNote(note);
      return;
    }

    // If not selected and can add more, toggle it
    if (canSelectMore) {
      onToggleNote(note);
      if (autoCloseOnSelect && selectedNotes.length === 0) {
        onBack();
      }
    }
  };

  const headerRight = isMultiSelectMode && selectedNotes.length > 0 && (
    <div className="flex items-center gap-2">
      <NoteAvatarStack notes={selectedNotes} size="sm" />
      {selectedNotes.length === 2 && (
        <span className="text-xs font-medium text-emerald-400">Merge</span>
      )}
    </div>
  );

  return (
    <ScreenLayout
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={
        <ScreenHeader
          title={isMultiSelectMode ? "Select Notes" : "Select Note"}
          onBack={onBack}
          rightContent={headerRight}
        />
      }
      contentClassName=""
      footer={
        isMultiSelectMode && selectedNotes.length > 0 ? (
          <div className="flex gap-2 p-4">
            {onClearSelection && (
              <Button variant="outline" onClick={onClearSelection} className="flex-1">
                Clear
              </Button>
            )}
            <Button onClick={onBack} className="flex-1">
              {selectedNotes.length === 1
                ? "Continue with 1 Note"
                : `Merge ${selectedNotes.length} Notes`}
            </Button>
          </div>
        ) : null
      }
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
        <>
          {/* Multi-select hint */}
          {isMultiSelectMode && (
            <div className="border-b border-white/5 bg-white/[0.02] px-4 py-2">
              <p className="text-xs text-neutral-400">
                Select up to 2 notes to merge them in a single withdrawal
              </p>
            </div>
          )}

          <div className="divide-y divide-white/5">
            {availableNotes.map((note) => {
              const selected = isNoteSelected(note);
              const noteId = `${note.depositIndex}-${note.changeIndex}`;
              const dotColor = getStatusDotColor(note);
              const disabled = !selected && !canSelectMore;

              return (
                <button
                  key={noteId}
                  type="button"
                  onClick={() => handleToggle(note)}
                  disabled={disabled}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selected
                      ? "bg-emerald-500/10"
                      : disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Checkbox + Status dot + Label + Timestamp */}
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Checkbox indicator for multi-select */}
                      {isMultiSelectMode && (
                        <div className="shrink-0">
                          {selected ? (
                            <CheckSquare className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <Square className="h-5 w-5 text-neutral-500" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
                          />
                          <span className="truncate font-mono text-sm font-medium text-white">
                            {note.serialNumber}
                          </span>
                        </div>
                        <div className="mt-0.5 pl-[18px] text-xs text-neutral-400">
                          {formatTimestamp(note.originTimestamp)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount with USD + Check if selected (single mode) */}
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
                      {!isMultiSelectMode && selected && (
                        <Check className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </ScreenLayout>
  );
}
