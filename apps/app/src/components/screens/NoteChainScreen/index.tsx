/**
 * Note Chain Screen Component
 * Full-screen view for displaying individual note details with UTXO-style navigation
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Note, NoteNode, NoteTree, DepositIntentNote, WithdrawalIntentNote } from "@shinobi-cash/core/discovery";
import {
  isSpendableNote,
  canWithdraw,
  canRagequit,
  isDepositIntentNote,
  isWithdrawalIntentNote,
} from "@shinobi-cash/core/discovery";
import { Lock, Unlock, Clock, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { WithdrawController } from "@/controllers/WithdrawController";
import { RagequitController } from "@/controllers/RagequitController";
import { useIntentDetails } from "@/hooks/useIntentDetails";
import { NoteUtxoView } from "./NoteUtxoView";
import { findNoteBySerial } from "./note-navigation";

// Commented out for UTXO view refactor - keep for potential future toggle
// import { HistoryTimeline } from "./HistoryTimeline";
// import { buildTimelineEntries } from "./utils";
// import { Section, Row } from "@/components/shared/Section";

interface NoteChainScreenProps {
  note: Note;
  noteNode: NoteNode;
  allTrees: NoteTree[];
  onBack: () => void;
}

interface NavigationStackItem {
  note: Note;
  node: NoteNode;
}

/**
 * Format countdown to refund availability
 */
function formatRefundCountdown(expiresTimestamp: string): { text: string; isAvailable: boolean } {
  const expiresMs = parseInt(expiresTimestamp, 10) * 1000;
  const now = Date.now();
  const diff = expiresMs - now;

  if (diff <= 0) {
    return { text: "Refund available", isAvailable: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return { text: `Refund in ${days}d ${hours % 24}h`, isAvailable: false };
  }
  if (hours > 0) {
    return { text: `Refund in ${hours}h ${minutes}m`, isAvailable: false };
  }
  return { text: `Refund in ${minutes}m`, isAvailable: false };
}

/**
 * Check if note is a pending intent (no children yet)
 */
function isPendingIntent(note: Note, node: NoteNode): note is DepositIntentNote | WithdrawalIntentNote {
  return (isDepositIntentNote(note) || isWithdrawalIntentNote(note)) && node.children.length === 0;
}

export function NoteChainScreen({ note, noteNode, allTrees, onBack }: NoteChainScreenProps) {
  const router = useRouter();

  // Navigation stack for back button support
  const [navigationStack, setNavigationStack] = useState<NavigationStackItem[]>([]);
  const [currentNote, setCurrentNote] = useState<Note>(note);
  const [currentNode, setCurrentNode] = useState<NoteNode>(noteNode);

  // Navigate to another note (push to stack)
  const handleNavigate = useCallback(
    (serialNumber: string) => {
      const result = findNoteBySerial(serialNumber, allTrees);
      if (result) {
        // Push current note to stack
        setNavigationStack((prev) => [...prev, { note: currentNote, node: currentNode }]);
        // Navigate to new note
        setCurrentNote(result.note);
        setCurrentNode(result.node);
      }
    },
    [allTrees, currentNote, currentNode]
  );

  // Handle back button
  const handleBack = useCallback(() => {
    if (navigationStack.length > 0) {
      // Pop from stack
      const newStack = [...navigationStack];
      const previous = newStack.pop()!;
      setNavigationStack(newStack);
      setCurrentNote(previous.note);
      setCurrentNode(previous.node);
    } else {
      // No stack, call original onBack
      onBack();
    }
  }, [navigationStack, onBack]);

  // Check if current note can be withdrawn/ragequit
  const canWithdrawPrivately = isSpendableNote(currentNote) && canWithdraw(currentNote);
  const canWithdrawPublicly = isSpendableNote(currentNote) && canRagequit(currentNote);

  // Check if current note is a pending intent (can show refund option)
  const pendingIntent = isPendingIntent(currentNote, currentNode);
  const orderId = pendingIntent ? currentNote.orderId : undefined;

  // Fetch actual intent details for expires timestamp
  const { intent, isLoading: isLoadingIntent } = useIntentDetails(orderId, {
    enabled: pendingIntent,
  });

  // Use fetched expires or fall back to note's (incorrect) value
  const expiresTimestamp = intent?.expires ?? (pendingIntent ? currentNote.expires : undefined);
  const refundInfo = expiresTimestamp ? formatRefundCountdown(expiresTimestamp) : null;

  const hasActions = canWithdrawPrivately || canWithdrawPublicly || pendingIntent;

  const handleWithdrawPrivately = () => {
    if (!isSpendableNote(currentNote)) return;
    WithdrawController.selectNote(currentNote);
    router.push(`/withdraw?note=${currentNote.depositIndex}`);
  };

  const handleWithdrawPublicly = () => {
    if (!isSpendableNote(currentNote)) return;
    RagequitController.selectNote(currentNote);
    router.push(`/ragequit?note=${currentNote.depositIndex}`);
  };

  // Build subtitle showing navigation depth
  const subtitle =
    navigationStack.length > 0
      ? `${navigationStack.length + 1} notes deep`
      : "Note details";

  return (
    <ScreenLayout
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={
        <ScreenHeader
          title="Note Details"
          subtitle={subtitle}
          onBack={handleBack}
        />
      }
      footer={
        hasActions ? (
          <div className="flex flex-row gap-3">
            {canWithdrawPublicly && (
              <Button
                onClick={handleWithdrawPublicly}
                variant="outline"
                className="h-12 flex-1 rounded-xl border-white/10 text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white"
                size="lg"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Ragequit
              </Button>
            )}
            {canWithdrawPrivately && (
              <Button
                onClick={handleWithdrawPrivately}
                className="h-12 flex-1 rounded-xl text-sm font-semibold sm:text-base"
                size="lg"
              >
                <Lock className="mr-2 h-4 w-4" />
                Withdraw Privately
              </Button>
            )}
            {pendingIntent && (
              <Button
                onClick={() => {
                  // TODO: Implement refund flow
                  console.log("Refund not implemented yet");
                }}
                variant="outline"
                disabled={isLoadingIntent || !refundInfo?.isAvailable}
                className="h-12 flex-1 rounded-xl border-white/10 text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white disabled:opacity-50"
                size="lg"
              >
                {isLoadingIntent ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="mr-2 h-4 w-4" />
                )}
                {isLoadingIntent ? "Loading..." : refundInfo?.text ?? "Refund"}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {/* UTXO View - INPUTS → THIS NOTE → OUTPUTS */}
      <NoteUtxoView
        note={currentNote}
        node={currentNode}
        onNavigate={handleNavigate}
      />
    </ScreenLayout>
  );
}
