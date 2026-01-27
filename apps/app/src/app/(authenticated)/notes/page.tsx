"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, History } from "lucide-react";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { NoteChainScreen } from "@/components/screens/NoteChainScreen";
import { NotesSection } from "@/components/notes/NotesSection";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { NoteChain } from "@shinobi-cash/core";
import { useNotesScreen } from "@/hooks/useNotesScreen";
import { NotesScreenSelectors } from "@/controllers/NotesScreenController";

export default function NotesPage() {
  const router = useRouter();
  const controller = useNotesScreen();

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
      containerClassName="h-[600px]"
      header={
        <ScreenHeader
          title="Notes"
          icon={<Banknote className="h-5 w-5" />}
          rightContent={
            <div className="flex items-center gap-2">
              {controller.syncError && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="cursor-pointer rounded p-1 hover:bg-white/10">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Unable to sync. Showing cached data.</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Link
                href="/activity"
                className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <History className="h-5 w-5" />
              </Link>
            </div>
          }
        />
      }
      contentClassName="px-4 sm:px-6"
    >
      {/* Balance Section */}
      <div className="shrink-0 border-b border-gray-800 pb-4">
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
