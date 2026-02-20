"use client";

import { useState, useCallback } from "react";
import { History } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import type { Note, NoteNode } from "@shinobi-cash/core/discovery";
import { ActivityFilterDropdown } from "@/components/activity/ActivityFilterDropdown";
import { ActivityList } from "@/components/activity/ActivityList";
import { ActivityDetailsScreen } from "@/components/screens/ActivityDetailsScreen";
import { NoteChainScreen } from "@/components/screens/NoteChainScreen";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useActivityScreen } from "@/hooks/useActivityScreen";
import { useNotesScreen } from "@/hooks/useNotesScreen";
import { findNoteBySerial } from "@/components/screens/NoteChainScreen/note-navigation";

export default function ActivityPage() {
  const controller = useActivityScreen();
  const notesController = useNotesScreen();

  // State for viewing a note chain from activity
  const [viewingNote, setViewingNote] = useState<{ note: Note; node: NoteNode } | null>(null);

  const handleViewNoteChain = useCallback(
    (note: Note) => {
      // Find the node for this note
      const result = findNoteBySerial(note.serialNumber, notesController.allTrees);
      if (result) {
        setViewingNote({ note, node: result.node });
      }
    },
    [notesController.allTrees]
  );

  // Show note chain if viewing a note
  if (viewingNote) {
    return (
      <NoteChainScreen
        note={viewingNote.note}
        noteNode={viewingNote.node}
        allTrees={notesController.allTrees}
        onBack={() => setViewingNote(null)}
      />
    );
  }

  // Show activity details if selected
  if (controller.selectedEntry) {
    return (
      <ActivityDetailsScreen
        entry={controller.selectedEntry}
        onBack={controller.clearSelection}
        onViewNoteChain={handleViewNoteChain}
        allTrees={notesController.allTrees}
      />
    );
  }

  return (
    <ScreenLayout
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={
        <ScreenHeader
          title="Activity"
          icon={<History className="h-5 w-5" />}
          rightContent={
            <div className="flex items-center gap-2">
              {controller.syncError && (
                <Badge variant="secondary" className="text-yellow-400">
                  Cached
                </Badge>
              )}
              <ActivityFilterDropdown
                activeFilter={controller.activeFilter}
                onFilterChange={controller.setFilter}
                counts={{
                  total: controller.totalCount,
                  deposit: controller.depositCount,
                  withdrawal: controller.withdrawalCount,
                  refund: controller.refundCount,
                }}
              />
            </div>
          }
        />
      }
      contentClassName="pb-4 pt-2"
    >
      <ActivityList
        entries={controller.filteredEntries}
        status={controller.status}
        activeFilter={controller.activeFilter}
        totalCount={controller.totalCount}
        onActivityClick={controller.selectActivity}
      />
    </ScreenLayout>
  );
}
