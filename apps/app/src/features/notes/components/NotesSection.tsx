/**
 * Notes Section - Refactored
 * Pure UI component that delegates all logic to useNotesController
 */

import { RefreshCw } from "lucide-react";
import { NoteRow } from "@/components/features/notes/NoteRow";
import { useNotesController } from "../controller/useNotesController";
import { NOTE_FILTER_LABELS, type NoteFilter, type NoteChain } from "../types";

interface NotesSectionProps {
  onNoteChainClick: (noteChain: NoteChain) => void;
}

export function NotesSection({ onNoteChainClick }: NotesSectionProps) {
  // All notes logic is in the controller
  const controller = useNotesController();

  const renderFilterButton = (filter: NoteFilter, count: number, borderColor: string) => (
    <button
      type="button"
      onClick={() => controller.setFilter(filter)}
      className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
        controller.activeFilter === filter
          ? `text-app-primary border-b-2 ${borderColor}`
          : "text-app-secondary hover:text-app-primary"
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
            <p className="text-app-secondary mb-1">Unable to load notes</p>
            <p className="text-app-tertiary text-sm">Please check your connection and try again</p>
          </div>
        </div>
      );
    }

    if (controller.status === "loading") {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="text-app-secondary mx-auto mb-2 h-6 w-6 animate-spin" />
            <p className="text-app-secondary">Discovering your notes...</p>
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
            <p className="text-app-secondary mb-1">No deposits yet</p>
            <p className="text-app-tertiary text-sm">
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
                <p className="text-app-secondary mb-1">No available funds</p>
                <p className="text-app-tertiary text-sm">All your deposits have been spent</p>
              </>
            ) : controller.activeFilter === "pending" ? (
              <>
                <span className="mb-2 block text-2xl">⏳</span>
                <p className="text-app-secondary mb-1">No pending deposits</p>
                <p className="text-app-tertiary text-sm">
                  All cross-chain deposits have been filled
                </p>
              </>
            ) : (
              <>
                <span className="mb-2 block text-2xl">🔒</span>
                <p className="text-app-secondary mb-1">No spent deposits</p>
                <p className="text-app-tertiary text-sm">Your deposits are still available</p>
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
      <div className="bg-app-surface border-app flex-shrink-0 rounded-t-xl border">
        <div className="flex">
          {renderFilterButton("available", controller.availableCount, "border-green-500")}
          {renderFilterButton("pending", controller.pendingCount, "border-yellow-500")}
          {renderFilterButton("spent", controller.spentCount, "border-red-500")}
        </div>
      </div>

      <div className="bg-app-surface border-app flex-1 overflow-hidden rounded-b-xl border-x border-b">
        <div className="h-full overflow-y-auto">
          {renderEmptyState()}

          {/* Render filtered notes */}
          {controller.filteredNoteViews.length > 0 && (
            <>
              {controller.filteredNoteViews.map((view) => (
                <div key={view.key} className="border-app-border border-b last:border-b-0">
                  <NoteRow
                    note={view.lastNote}
                    chainLength={view.length}
                    onClick={() => onNoteChainClick(view.chain)}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
