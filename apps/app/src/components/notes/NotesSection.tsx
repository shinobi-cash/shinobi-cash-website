/**
 * Notes Section - UTXO-style display
 * Shows individual notes (not grouped by tree) with filtering
 */

import { RefreshCw } from "lucide-react";
import { NoteRow } from "./NoteRow";
import { type NotesScreenControllerAPI } from "@/hooks/useNotesScreen";
import { NOTE_FILTER_LABELS, type NoteFilter } from "@/types/notes";
import type { Note, NoteNode } from "@shinobi-cash/core/discovery";

interface NotesSectionProps {
  controller: NotesScreenControllerAPI;
  onNoteClick: (note: Note, node: NoteNode) => void;
}

export function NotesSection({ controller, onNoteClick }: NotesSectionProps) {
  const renderFilterButton = (filter: NoteFilter, count: number, borderColor: string) => (
    <button
      type="button"
      onClick={() => controller.setFilter(filter)}
      className={`flex-1 cursor-pointer px-4 py-2 text-sm font-semibold transition-colors ${
        controller.activeFilter === filter
          ? `border-b-2 text-white ${borderColor}`
          : "text-neutral-400 hover:text-white"
      }`}
    >
      {NOTE_FILTER_LABELS[filter]} ({count})
    </button>
  );

  const renderEmptyState = () => {
    if (controller.status === "error") {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="mb-1 text-neutral-400">Unable to load notes</p>
            <p className="text-sm text-neutral-500">Please check your connection and try again</p>
          </div>
        </div>
      );
    }

    if (controller.status === "loading") {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-neutral-400" />
            <p className="text-neutral-400">Discovering your notes...</p>
          </div>
        </div>
      );
    }

    // No notes at all
    if (controller.status === "empty") {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <span className="mb-2 block text-2xl">💰</span>
            <p className="mb-1 text-neutral-400">No deposits yet</p>
            <p className="text-sm text-neutral-500">
              Make your first private deposit to get started
            </p>
          </div>
        </div>
      );
    }

    // Has notes but none match current filter
    if (controller.filteredNoteViews.length === 0 && controller.totalCount > 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            {controller.activeFilter === "spendable" ? (
              <>
                <span className="mb-2 block text-2xl">💸</span>
                <p className="mb-1 text-neutral-400">No spendable funds</p>
                <p className="text-sm text-neutral-500">
                  All your deposits have been spent or are pending
                </p>
              </>
            ) : controller.activeFilter === "pending" ? (
              <>
                <span className="mb-2 block text-2xl">⏳</span>
                <p className="mb-1 text-neutral-400">No pending deposits</p>
                <p className="text-sm text-neutral-500">
                  All cross-chain deposits have been filled
                </p>
              </>
            ) : (
              <>
                <span className="mb-2 block text-2xl">🔒</span>
                <p className="mb-1 text-neutral-400">No spent deposits</p>
                <p className="text-sm text-neutral-500">Your deposits are still spendable</p>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-shrink-0 border-b border-white/10">
        <div className="flex">
          {renderFilterButton("spendable", controller.spendableCount, "border-emerald-400")}
          {renderFilterButton("pending", controller.pendingCount, "border-yellow-400")}
          {renderFilterButton("spent", controller.spentCount, "border-rose-400")}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {renderEmptyState()}

          {/* Render individual notes */}
          {controller.filteredNoteViews.length > 0 && (
            <div className="divide-y divide-white/5">
              {controller.filteredNoteViews.map((view) => (
                <NoteRow
                  key={view.key}
                  note={view.note}
                  onClick={() => onNoteClick(view.note, view.node)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
