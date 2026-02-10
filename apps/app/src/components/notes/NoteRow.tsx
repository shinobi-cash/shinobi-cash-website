/**
 * Note Row Component
 *
 * Displays a single note in the notes list with action menu.
 */

import { useRouter } from "next/navigation";
import type { Note } from "@shinobi-cash/core/discovery";
import { isIntentNote, canWithdraw, canRagequit } from "@shinobi-cash/core/discovery";
import { MoreVertical, Eye, Lock, Unlock, Clock } from "lucide-react";
import { formatTimestamp } from "@/utils/formatters";
import { getStatusDotColor } from "@/utils/noteFiltering";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { WithdrawController } from "@/controllers/WithdrawController";
import { RagequitController } from "@/controllers/RagequitController";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

interface NoteRowProps {
  note: Note;
  onClick?: () => void;
}

export function NoteRow({ note, onClick }: NoteRowProps) {
  const router = useRouter();
  const dotColor = getStatusDotColor(note);

  const canWithdrawPrivately = canWithdraw(note);
  const canWithdrawPublicly = canRagequit(note);

  // Intent notes show "Awaiting delivery" status
  const isIntent = isIntentNote(note);
  const intentStatusText = isIntent ? "Awaiting cross-chain delivery" : null;

  const displayTimestamp = note.originTimestamp;

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleWithdrawPrivately = (e: React.MouseEvent) => {
    e.stopPropagation();
    WithdrawController.selectNote(note);
    router.push(`/withdraw?note=${note.depositIndex}`);
  };

  const handleWithdrawPublicly = (e: React.MouseEvent) => {
    e.stopPropagation();
    RagequitController.selectNote(note);
    router.push(`/ragequit?note=${note.depositIndex}`);
  };

  return (
    <div className="flex w-full items-center px-4 py-3 transition-colors hover:bg-white/[0.04]">
      {/* Main clickable area */}
      <button
        type="button"
        className="min-w-0 flex-1 cursor-pointer text-left"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: Status dot + Label + Status/Timestamp */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
              <span className="truncate text-sm font-medium font-mono text-white">{note.serialNumber}</span>
            </div>
            <div className="mt-0.5 pl-[18px] text-xs text-neutral-400">
              {intentStatusText ? (
                <span>{intentStatusText}</span>
              ) : (
                formatTimestamp(displayTimestamp)
              )}
            </div>
          </div>

          {/* Right: Amount with USD */}
          <div className="shrink-0 text-right">
            <AmountDisplay
              amount={note.amount}
              layout="stacked"
              ethOptions={{ maxDecimals: 6 }}
              ethClassName="text-sm font-semibold tabular-nums text-white"
              usdClassName="text-xs text-neutral-500"
            />
          </div>
        </div>
      </button>

      {/* 3-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-border bg-background w-48 p-1">
          <DropdownMenuItem
            onClick={handleViewDetails}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            View Details
          </DropdownMenuItem>

          {canWithdrawPrivately && (
            <DropdownMenuItem
              onClick={handleWithdrawPrivately}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              Withdraw Privately
            </DropdownMenuItem>
          )}

          {canWithdrawPublicly && (
            <DropdownMenuItem
              onClick={handleWithdrawPublicly}
              className="cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300"
            >
              <Unlock className="h-4 w-4" />
              Ragequit
            </DropdownMenuItem>
          )}

          {isIntent && (
            <DropdownMenuItem
              disabled
              className="cursor-not-allowed text-neutral-500"
            >
              <Clock className="h-4 w-4" />
              Awaiting Delivery
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
