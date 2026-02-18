"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { NoteChainScreen } from "@/components/screens/NoteChainScreen";
import { NotesSection } from "@/components/notes/NotesSection";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import type { NoteTree } from "@shinobi-cash/core/discovery";
import { useNotesScreen } from "@/hooks/useNotesScreen";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

export default function NotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const controller = useNotesScreen();

  // Handle depositIndex query param from Activity → View Note Chain navigation
  const depositIndexParam = searchParams.get("depositIndex");
  const { isLoading, selectNoteTree } = controller;
  useEffect(() => {
    if (!depositIndexParam || isLoading) return;

    const depositIndex = parseInt(depositIndexParam, 10);
    if (isNaN(depositIndex)) return;

    // Find matching note tree by deposit index
    const noteTrees = NotesDiscoveryController.state.noteTrees;
    const matchingTree = noteTrees.find((tree) => {
      return tree.root.note.depositIndex === depositIndex;
    });

    if (matchingTree) {
      selectNoteTree(matchingTree as NoteTree);
      // Clear the query param to avoid re-selecting on subsequent renders
      router.replace("/notes", { scroll: false });
    }
  }, [depositIndexParam, isLoading, selectNoteTree, router]);

  // Show note tree details screen
  if (controller.selectedNoteTree) {
    return (
      <NoteChainScreen noteTree={controller.selectedNoteTree} onBack={controller.clearSelection} />
    );
  }

  return (
    <ScreenLayout
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={
        <ScreenHeader
          title="Notes"
          icon={<Banknote className="h-5 w-5" />}
          rightContent={
            controller.syncError ? (
              <Badge variant="secondary" className="text-yellow-400">
                Cached
              </Badge>
            ) : undefined
          }
        />
      }
      contentClassName=""
    >
      {/* Balance Section */}
      <div className="shrink-0 border-b border-white/10 px-4 pb-4">
        <AmountDisplay
          amount={controller.totalBalance}
          layout="stacked"
          ethOptions={{ decimals: 4 }}
          ethClassName="mb-1 text-3xl font-bold text-white sm:text-4xl"
          usdClassName="text-base text-gray-400"
        />
      </div>

      {/* Notes Section - Scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <NotesSection controller={controller} onNoteTreeClick={controller.selectNoteTree} />
      </div>
    </ScreenLayout>
  );
}
