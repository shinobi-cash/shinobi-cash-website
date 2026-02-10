/**
 * NoteAvatarGroup - Displays 1-2 selected notes as stacked avatars
 *
 * Single note:  [1]
 * Two notes:    [1][2] (overlapping)
 */

import { Banknote, Plus } from "lucide-react";
import type { Note } from "@shinobi-cash/core/discovery";
import { cn } from "@workspace/ui/lib/utils";

interface NoteAvatarGroupProps {
  notes: Note[];
  maxNotes?: number;
  onClick?: () => void;
  disabled?: boolean;
  showAddButton?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function NoteAvatarGroup({
  notes,
  maxNotes = 2,
  onClick,
  disabled = false,
  showAddButton = true,
  size = "md",
  className,
}: NoteAvatarGroupProps) {
  const canAddMore = notes.length < maxNotes && showAddButton;
  const sizeClasses = size === "sm"
    ? { avatar: "h-6 w-6", icon: "h-3 w-3", text: "text-[10px]", overlap: "-ml-2" }
    : { avatar: "h-8 w-8", icon: "h-4 w-4", text: "text-xs", overlap: "-ml-3" };

  if (notes.length === 0) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-neutral-400 transition-colors",
          !disabled && "hover:bg-white/[0.08] hover:text-white cursor-pointer",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <Banknote className="h-3 w-3" />
        <span>Select Note</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 transition-colors",
        !disabled && "hover:bg-white/[0.08] cursor-pointer",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Avatar Stack */}
      <div className="flex items-center">
        {notes.map((note, index) => (
          <div
            key={`${note.depositIndex}-${note.changeIndex}`}
            className={cn(
              sizeClasses.avatar,
              "relative flex items-center justify-center rounded-full border-2 border-neutral-900 bg-emerald-600 font-semibold text-white",
              sizeClasses.text,
              index > 0 && sizeClasses.overlap
            )}
            style={{ zIndex: notes.length - index }}
          >
            {note.depositIndex + 1}
          </div>
        ))}

        {/* Add button placeholder */}
        {canAddMore && (
          <div
            className={cn(
              sizeClasses.avatar,
              sizeClasses.overlap,
              "flex items-center justify-center rounded-full border-2 border-dashed border-white/20 bg-white/[0.04] text-neutral-500"
            )}
            style={{ zIndex: 0 }}
          >
            <Plus className={sizeClasses.icon} />
          </div>
        )}
      </div>

      {/* Label */}
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium font-mono text-white">
          {notes.length === 1
            ? notes[0].serialNumber
            : `${notes.length} Notes`
          }
        </span>
      </div>
    </button>
  );
}

/**
 * Compact version for tight spaces - just the avatars
 */
export function NoteAvatarStack({
  notes,
  size = "sm",
  className,
}: {
  notes: readonly Note[];
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClasses = size === "sm"
    ? { avatar: "h-5 w-5", text: "text-[9px]", overlap: "-ml-1.5" }
    : { avatar: "h-6 w-6", text: "text-[10px]", overlap: "-ml-2" };

  if (notes.length === 0) return null;

  return (
    <div className={cn("flex items-center", className)}>
      {notes.map((note, index) => (
        <div
          key={`${note.depositIndex}-${note.changeIndex}`}
          className={cn(
            sizeClasses.avatar,
            "flex items-center justify-center rounded-full border border-neutral-800 bg-emerald-600 font-semibold text-white",
            sizeClasses.text,
            index > 0 && sizeClasses.overlap
          )}
          style={{ zIndex: notes.length - index }}
        >
          {note.depositIndex + 1}
        </div>
      ))}
    </div>
  );
}
