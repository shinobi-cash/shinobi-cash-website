import { AlertCircle, CheckCircle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "../../ui/button";

interface NotesSummaryCardProps {
  unspentNotes: number;
  totalNotes: number;
  isRediscovering?: boolean;
  onRediscover?: () => void;
  isScanning?: boolean;
  scanProgress?: { pagesProcessed: number; complete: boolean };
  syncError?: boolean;
  newNotesFound?: number;
}

export function NotesSummaryCard({
  unspentNotes,
  totalNotes,
  isRediscovering,
  onRediscover,
  isScanning,
  scanProgress,
  syncError,
  newNotesFound,
}: NotesSummaryCardProps) {
  const spentNotes = totalNotes - unspentNotes;

  // Determine sync status display
  const getSyncStatus = () => {
    if (isScanning || (scanProgress && !scanProgress.complete)) {
      return {
        icon: <Loader2 className="w-3 h-3 animate-spin text-blue-500" />,
        text: "Scanning",
        className: "text-blue-600",
      };
    }

    if (syncError) {
      return {
        icon: <AlertCircle className="w-3 h-3 text-red-500" />,
        text: "Failed",
        className: "text-red-600",
      };
    }

    if (newNotesFound && newNotesFound > 0) {
      return {
        icon: <CheckCircle className="w-3 h-3 text-green-500" />,
        text: `+${newNotesFound} new`,
        className: "text-green-600",
      };
    }

    return null;
  };

  const syncStatus = getSyncStatus();

  return (
    <div className="flex-shrink-0">
      <div className="bg-app-surface p-2 border border-app rounded-xl shadow-sm">
        <div className="flex justify-between items-end mb-3">
          <div className="flex gap-6">
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-app-secondary mb-1">Available</p>
              <p className="text-xl font-bold text-app-primary tabular-nums">{unspentNotes}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-app-secondary mb-1">Spent</p>
              <p className="text-xl font-bold text-app-primary tabular-nums">{spentNotes}</p>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-sm font-semibold text-app-secondary mb-1">Status</p>
            <div className="flex items-center gap-1.5 justify-end">
              {syncStatus ? (
                <div className={`flex items-center gap-1.5 ${syncStatus.className}`}>
                  {syncStatus.icon}
                  <span className="text-sm font-medium">{syncStatus.text}</span>
                </div>
              ) : (
                <span className="text-sm font-medium text-green-600">Synced</span>
              )}
              {onRediscover && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    // Remove focus before triggering refresh actions that may open modals
                    const target = e.currentTarget as HTMLElement;
                    if (typeof target.blur === "function") target.blur();
                    onRediscover();
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={isRediscovering}
                  className="h-6 w-6 p-0 text-app-tertiary hover:text-app-primary"
                  title="Refresh deposits from blockchain"
                  tabIndex={-1}
                >
                  <RotateCcw className={`w-3 h-3 ${isRediscovering ? "animate-spin" : ""}`} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
