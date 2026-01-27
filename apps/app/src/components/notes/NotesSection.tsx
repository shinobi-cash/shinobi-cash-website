/**
 * Notes Section - Refactored
 * Pure UI component that delegates all logic to useNotesController
 */

import { RefreshCw } from "lucide-react";
import { NoteRow } from "./NoteRow";
import { type NotesScreenControllerAPI } from "@/hooks/useNotesScreen";
import { NOTE_FILTER_LABELS, type NoteFilter } from "@/types/notes";
import { NoteChain } from "@shinobi-cash/core";

interface NotesSectionProps {
  controller: NotesScreenControllerAPI;
  onNoteChainClick: (noteChain: NoteChain) => void;
}

export function NotesSection({ controller, onNoteChainClick }: NotesSectionProps) {
  // Controller is passed in to avoid double instantiation

  const renderFilterButton = (filter: NoteFilter, count: number, borderColor: string) => (
    <button
      type="button"
      onClick={() => controller.setFilter(filter)}
      className={`flex-1 cursor-pointer px-4 py-2 text-sm font-semibold transition-colors ${
        controller.activeFilter === filter
          ? `text-white border-b-2 ${borderColor}`
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
            <p className="text-neutral-400 mb-1">Unable to load notes</p>
            <p className="text-neutral-500 text-sm">Please check your connection and try again</p>
          </div>
        </div>
      );
    }

    if (controller.status === "loading") {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="text-neutral-400 mx-auto mb-2 h-6 w-6 animate-spin" />
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
            <p className="text-neutral-400 mb-1">No deposits yet</p>
            <p className="text-neutral-500 text-sm">
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
            {controller.activeFilter === "available" ? (
              <>
                <span className="mb-2 block text-2xl">💸</span>
                <p className="text-neutral-400 mb-1">No available funds</p>
                <p className="text-neutral-500 text-sm">All your deposits have been spent</p>
              </>
            ) : controller.activeFilter === "pending" ? (
              <>
                <span className="mb-2 block text-2xl">⏳</span>
                <p className="text-neutral-400 mb-1">No pending deposits</p>
                <p className="text-neutral-500 text-sm">
                  All cross-chain deposits have been filled
                </p>
              </>
            ) : (
              <>
                <span className="mb-2 block text-2xl">🔒</span>
                <p className="text-neutral-400 mb-1">No spent deposits</p>
                <p className="text-neutral-500 text-sm">Your deposits are still available</p>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-2">
      <div className="flex-shrink-0">
        <div className="flex">
          {renderFilterButton("available", controller.availableCount, "border-emerald-400")}
          {renderFilterButton("pending", controller.pendingCount, "border-yellow-400")}
          {renderFilterButton("spent", controller.spentCount, "border-rose-400")}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full space-y-2 overflow-y-auto">
          {renderEmptyState()}

          {/* Render filtered notes */}
          {controller.filteredNoteViews.length > 0 && (
            <>
              {controller.filteredNoteViews.map((view) => (
                <div key={view.key} className="border-white/10 border-b last:border-b-0">
                  <NoteRow note={view.lastNote} onClick={() => onNoteChainClick(view.chain)} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
