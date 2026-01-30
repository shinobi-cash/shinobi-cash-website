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
import { NoteChain } from "@shinobi-cash/core";
import { useNotesScreen } from "@/hooks/useNotesScreen";
import { NotesScreenSelectors } from "@/controllers/NotesScreenController";
import { NotesDiscoveryController } from "@/controllers/NotesDiscoveryController";

export default function NotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const controller = useNotesScreen();

  // Handle depositIndex query param from Activity → View Note Chain navigation
  const depositIndexParam = searchParams.get("depositIndex");
  const { isLoading, selectNoteChain } = controller;
  useEffect(() => {
    if (!depositIndexParam || isLoading) return;

    const depositIndex = parseInt(depositIndexParam, 10);
    if (isNaN(depositIndex)) return;

    // Find matching note chain by deposit index
    const noteChains = NotesDiscoveryController.state.noteChains;
    const matchingChain = noteChains.find((chain) => {
      if (chain.length === 0) return false;
      return chain[0].depositIndex === depositIndex;
    });

    if (matchingChain) {
      selectNoteChain(matchingChain as NoteChain);
      // Clear the query param to avoid re-selecting on subsequent renders
      router.replace("/notes", { scroll: false });
    }
  }, [depositIndexParam, isLoading, selectNoteChain, router]);

  const startWithdrawal = (noteChain: NoteChain) => {
    if (NotesScreenSelectors.canWithdrawFromChain(noteChain)) {
      controller.clearSelection();
      router.push("/withdraw");
    }
  };

  // Show note chain details screen
  if (controller.selectedNoteChain) {
    return (
      <NoteChainScreen
        noteChain={controller.selectedNoteChain}
        onBack={controller.clearSelection}
        onWithdrawClick={startWithdrawal}
      />
    );
  }

  return (
    <ScreenLayout
      containerClassName="h-[600px] bg-white/[0.02]"
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
        <NotesSection controller={controller} onNoteChainClick={controller.selectNoteChain} />
      </div>
    </ScreenLayout>
  );
}
