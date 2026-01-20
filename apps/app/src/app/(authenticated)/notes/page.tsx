"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { NoteChainScreen } from "@/components/screens/NoteChainScreen";
import { NotesSection } from "@/components/notes/NotesSection";
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
    <div className="flex h-[600px] w-full flex-col">
      {/* Balance Section - Fixed */}
      <div className="shrink-0 border-b border-gray-800 px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex items-start gap-2">
          <AmountDisplay
            amount={controller.totalBalance}
            layout="stacked"
            ethOptions={{ decimals: 4 }}
            ethClassName="mb-1 text-3xl font-bold text-white sm:text-4xl"
            usdClassName="text-base text-gray-400"
          />
          {controller.syncError && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="mt-1 rounded p-1 hover:bg-white/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Unable to sync. Showing cached data.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Notes Section - Scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
        <NotesSection controller={controller} onNoteChainClick={controller.selectNoteChain} />
      </div>
    </div>
  );
}
